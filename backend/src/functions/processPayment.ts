import { SQSHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// Atenção: Esta função NÃO é APIGateway. Ela é engatilhada apenas pela Fila SQS!
export const handler: SQSHandler = async (event) => {
  // A fila pode mandar várias mensagens juntas (em lote). Vamos ler uma por uma:
  for (const record of event.Records) {
    const message = JSON.parse(record.body);
    const { paymentId, eventId } = message;

    try {
      // Comando: diminua 1 do total
      const checkTicketParams = new UpdateCommand({
        TableName: process.env.EVENTS_TABLE,
        Key: { eventID: eventId },
        UpdateExpression: "SET availableTickets = availableTickets - :um",
        ConditionExpression: "availableTickets >= :um",
        ExpressionAttributeValues: {
          ":um": 1,
        },
      });

      try {
        await docClient.send(checkTicketParams);
        // Se a linha acima passar sem erro, significa que GARANTIMOS 1 ingresso pra nós!
        // Pseudo-aleatório: 80% de chance de Aprovar, 20% de dar cartão recusado
        const isCardApproved = Math.random() > 0.2;

        if (isCardApproved) {
          // Cenário Feliz: Aprovou o cartão, ingresso garantido!
          await updatePaymentStatus(paymentId, "APPROVED");
          console.log(`Sucesso: Compra do ingresso para evento [${eventId}] aprovada.`);
        } else {
          // Cenário Triste (SAGA/Compensação): Cartão foi recusado!
          // Temos que devolver aquele 1 ingresso que reservamos no PASSO 1.
          await updatePaymentStatus(paymentId, "REJECTED_CARD_DENIED");
          
          await docClient.send(new UpdateCommand({
            TableName: process.env.EVENTS_TABLE,
            Key: { eventID: eventId },
            UpdateExpression: "SET availableTickets = availableTickets + :um", // Devolvendo (+1)
            ExpressionAttributeValues: { ":um": 1 },
          }));
          console.log(`Falha: Cartão recusado. Devolvendo 1 ingresso para [${eventId}]`);
        }

      } catch (error: any) {
        //INGRESSOS ESGOTADOS!
        // Se a ConditionExpression falhar, a AWS cospe o erro chamado "ConditionalCheckFailedException"
        if (error.name === "ConditionalCheckFailedException" || error.message?.includes("ConditionalCheckFailed")) {
          console.log(`Esgotado: Não há mais ingressos para o evento [${eventId}]`);
          await updatePaymentStatus(paymentId, "REJECTED_SOLD_OUT");
        } else {
          // Outro erro genérico do banco
          throw error; 
        }
      }

    } catch (err) {
      console.error("Erro ao processar mensagem do SQS:", err);
      // Se der um erro muito bizarro, deixamos o SQS tentar processar a mensagem de novo depois
      throw err; 
    }
  }
};

// --- Função Auxiliar simplificada para mudar o texto lá na tabela de Pagamentos ---
async function updatePaymentStatus(paymentId: string, newStatus: string) {
  const params = new UpdateCommand({
    TableName: process.env.PAYMENTS_TABLE,
    Key: { paymentID: paymentId },
    UpdateExpression: "SET #st = :statusAtualizado",
    ExpressionAttributeNames: { "#st": "status" }, // 'status' é palavra reservada na AWS, por isso passamos assim
    ExpressionAttributeValues: { ":statusAtualizado": newStatus },
  });
  await docClient.send(params);
}

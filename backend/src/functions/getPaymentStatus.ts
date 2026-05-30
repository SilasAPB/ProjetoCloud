import { APIGatewayProxyHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    // Pegando o ID do pedido que veio na URL (Ex: GET /payments/12345)
    // O sinal "?" Evita que o código quebre caso a URL venha vazia
    const paymentId = event.pathParameters?.paymentId;

    if (!paymentId) {
      return { statusCode: 400, body: JSON.stringify({ message: "É necessário informar o paymentId na URL" }) };
    }

    // Pedindo para o Banco buscar apenas esse pagamento específico
    const getParams = new GetCommand({
      TableName: process.env.PAYMENTS_TABLE,
      Key: {
        paymentID: paymentId,
      },
    });
    
    // ".Item" contém o nosso documento inteiro salvo no DynamoDB
    const result = await docClient.send(getParams);

    if (!result.Item) {
      // Se tiver vazio, o pedido não existe
      return { statusCode: 404, body: JSON.stringify({ message: "Pagamento não encontrado" }) };
    }

    // Se achou, devolve tudo para a tela (Inclusive o famoso STATUS: PENDING/APPROVED)
    return {
      statusCode: 200, // 200 = OK
      body: JSON.stringify(result.Item),
    };

  } catch (error) {
    console.error("Erro ao consultar status:", error);
    return { statusCode: 500, body: JSON.stringify({ message: "Erro interno no servidor" }) };
  }
};

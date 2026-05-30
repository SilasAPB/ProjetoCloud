import { APIGatewayProxyHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { v4 as uuidv4 } from "uuid";

// Conectando com o Banco de Dados (DynamoDB) e com a Fila (SQS)
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const sqsClient = new SQSClient({});

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    // 1. Le o que o usuário quer comprar (que vem no formato JSON)
    const body = JSON.parse(event.body || "{}");
    const { userId, eventId, amount } = body;

    // 2. Cria uma ID única para esse pedido de compra
    const paymentId = uuidv4();
    const createdAt = new Date().toISOString();

    // 3. Salva no Banco de Dados com o status inicial: "PENDING" (Pendente)

    const putParams = new PutCommand({
      TableName: process.env.PAYMENTS_TABLE,
      Item: {
        paymentID: paymentId,
        userID: userId,
        eventID: eventId,
        amount: Number(amount),
        status: "PENDING", // Status dizendo que tá na fila!
        createdAt: createdAt
      },
    });
    await docClient.send(putParams);

    // 4. mensaegm pra a fila
    const sqsParams = new SendMessageCommand({
      QueueUrl: process.env.QUEUE_URL,
      MessageBody: JSON.stringify({
        paymentId: paymentId,
        eventId: eventId,
        userId: userId
      }),
    });
    await sqsClient.send(sqsParams);
    
    return {
      statusCode: 202, 
      body: JSON.stringify({ 
        message: "Seu pedido está na fila de processamento!",
        paymentId: paymentId
      }),
    };
  } catch (error) {
    console.error("Erro na compra:", error);
    return { statusCode: 500, body: JSON.stringify({ message: "Erro interno" }) };
  }
};

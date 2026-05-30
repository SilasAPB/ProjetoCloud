import { APIGatewayProxyHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { name, capacity, occurrenceAt } = body;

    const eventId = uuidv4();
    const createdAt = new Date().toISOString();

    const putParams = new PutCommand({
      TableName: process.env.EVENTS_TABLE,
      Item: {
        eventID: eventId,
        name: name,
        capacity: Number(capacity),
        availableTickets: Number(capacity),
        occurrenceAt: occurrenceAt,
        createdAt: createdAt
      },
    });

    await docClient.send(putParams);

    return {
      statusCode: 201,
      body: JSON.stringify({ message: "Evento criado com sucesso", eventId }),
    };
  } catch (error) {
    console.error("Erro ao criar evento:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Erro interno no servidor" }),
    };
  }
};

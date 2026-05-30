import { APIGatewayProxyHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler: APIGatewayProxyHandler = async () => {
  try {
    //scan do DynamoDB para pegar TODOS os eventos cadastrados (Sem filtro, sem chave, sem nada)
    const scanParams = new ScanCommand({
      TableName: process.env.EVENTS_TABLE,
    });

    const result = await docClient.send(scanParams);

    return {
      statusCode: 200,
      body: JSON.stringify(result.Items || []), // garante o retorno de um array
    };
  } catch (error) {
    console.error("Erro ao listar eventos:", error);
    return { statusCode: 500, body: JSON.stringify({ message: "Erro interno no servidor" }) };
  }
};

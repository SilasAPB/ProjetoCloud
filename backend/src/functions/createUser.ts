import { APIGatewayProxyHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";

// Configuração do Cliente do DynamoDB (Já puxa as credenciais automáticas do AWS CLI)
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    // Pegando os dados que o frontend (ou Postman/Insomnia) mandou no corpo da requisição POST
    const body = JSON.parse(event.body || "{}");
    const { name, email, telephone, password } = body;

    // Gerando o ID único string (UUID)
    const userId = uuidv4();
    const createdAt = new Date().toISOString();

    // Parâmetros para salvar no DynamoDB
    const putParams = new PutCommand({
      TableName: process.env.USERS_TABLE, // Pegando o nome da tabela do serverless.yml
      Item: {
        userID: userId,
        name,
        email,
        telephone,
        password, // Nota: Num projeto real de produção, sempre criaríamos um Hash (bcrypt) disso!
        createdAt,
      },
    });

    // Executando o comando de salvar no Banco
    await docClient.send(putParams);

    // Devolvendo a resposta de Sucesso para quem chamou a API
    return {
      statusCode: 201, // 201 = Created
      body: JSON.stringify({ message: "Usuário criado com sucesso", userId }),
    };
  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    return {
      statusCode: 500, // 500 = Internal Server Error
      body: JSON.stringify({ message: "Erro interno no servidor" }),
    };
  }
};

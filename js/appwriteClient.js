import { Client, Account, Databases, Storage } 
from "https://cdn.jsdelivr.net/npm/appwrite@15.0.0/+esm";

export async function createAppwriteClient() {

    const backend = "https://as-music-player-application.vercel.app/api/config";

    const response = await fetch(backend);
    const config = await response.json();

  const projectId = config.projectId;
  const endPoint  = config.endPoint;

  const client = new Client()
    .setEndpoint(endPoint)
    .setProject(projectId)

  return {
    client,
    auth: new Account(client),
    database: new Databases(client),
    storage: new Storage(client),
  };
}

console.log("App Write Working!");
const fastify = require('fastify');
const app = fastify();

app.listen({port: 3001}, () => {
    console.log("auteur service running");
});
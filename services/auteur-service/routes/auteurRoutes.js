

function router(fastify, opts){
    const Auteur = require('./../models/auteur');
    fastify.get("/auteur",async (request, reply) => {
        const auteurs = await Auteur.findAll();
        return reply.send(auteurs);
    });
    fastify.post("/auteur", async (request, reply) => {
        const {nom} = request.body;
        const auteur = await Auteur.create({nom});
        return reply.code(201).send(auteur);
    });

    fastify.delete("/auteur",(request, reply)=>)
}

module.exports = router;
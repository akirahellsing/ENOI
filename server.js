const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const gtts = require('gtts');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Servir arquivos estáticos da pasta public
app.use(express.static(path.join(__dirname, 'public')));

let fila = [];
let historico = [];
let contadorSenhaNormal = 1;
let contadorSenhaPref = 1;

io.on('connection', (socket) => {
    console.log('Cliente conectado ao sistema ENOI.');
    socket.emit('estado-inicial', { fila, historico });

    // Adicionar novo paciente
    socket.on('adicionar-paciente', (dados) => {
        const prefixo = dados.preferencial ? 'P' : 'N';
        const numero = dados.preferencial ? contadorSenhaPref++ : contadorSenhaNormal++;
        const senhaGerada = `${prefixo}${String(numero).padStart(2, '0')}`;
        
        const novoPaciente = {
            id: Date.now().toString(),
            senha: senhaGerada,
            nome: dados.nome,
            consultorio: dados.consultorio,
            medico: dados.medico,
            preferencial: dados.preferencial,
            horarioEntrada: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        };

        if (dados.preferencial) {
            const ultimoPrefIndex = fila.findLastIndex(p => p.preferencial);
            fila.splice(ultimoPrefIndex + 1, 0, novoPaciente);
        } else {
            fila.push(novoPaciente);
        }

        io.emit('atualizar-fila', fila);
        console.log(`Paciente cadastrado: ${senhaGerada} - ${dados.nome}`);
    });

    // Chamar próximo paciente
    socket.on('medico-chamar-proximo', (dados) => {
        const index = fila.findIndex(p => p.consultorio.toLowerCase() === dados.consultorio.toLowerCase());

        if (index === -1) {
            socket.emit('aviso-medico', 'Não há pacientes aguardando nesta fila!');
            return;
        }

        const pacienteChamado = fila.splice(index, 1)[0];
        const textoChamada = `Senha ${pacienteChamado.senha}, ${pacienteChamado.nome}, comparecer ao ${pacienteChamado.consultorio}`;
        
        const nomeArquivoAudio = `chamada_${Date.now()}.mp3`;
        const caminhoAudio = path.join(__dirname, 'public', nomeArquivoAudio);
        
        const speech = new gtts(textoChamada, 'pt');
        speech.save(caminhoAudio, function (err) {
            if (err) {
                console.error("Erro no gTTS:", err);
            }

            const dadosPainel = {
                ultima: {
                    senha: pacienteChamado.senha,
                    nome: pacienteChamado.nome,
                    destino: pacienteChamado.consultorio,
                    horarioEntrada: pacienteChamado.horarioEntrada,
                    audioUrl: err ? null : `/${nomeArquivoAudio}`
                },
                historico: historico.slice(0, 4)
            };

            historico.unshift({
                senha: pacienteChamado.senha,
                nome: pacienteChamado.nome,
                destino: pacienteChamado.consultorio
            });
            if (historico.length > 5) historico.pop();

            io.emit('atualizar-painel', dadosPainel);
            io.emit('atualizar-fila', fila);
            console.log(`Chamando: ${pacienteChamado.senha} - ${pacienteChamado.nome}`);

            if (!err) {
                setTimeout(() => {
                    fs.unlink(caminhoAudio, () => {});
                }, 15000);
            }
        });
    });

    // Rechamar paciente atual
    socket.on('medico-rechamar', (paciente) => {
        const textoChamada = `Senha ${paciente.senha}, ${paciente.nome}, comparecer ao ${paciente.consultorio}`;
        const nomeArquivoAudio = `chamada_${Date.now()}.mp3`;
        const caminhoAudio = path.join(__dirname, 'public', nomeArquivoAudio);

        const speech = new gtts(textoChamada, 'pt');
        speech.save(caminhoAudio, function (err) {
            if (err) {
                console.error("Erro no gTTS:", err);
            }

            const dadosPainel = {
                ultima: {
                    senha: paciente.senha,
                    nome: paciente.nome,
                    destino: paciente.consultorio,
                    audioUrl: err ? null : `/${nomeArquivoAudio}`
                },
                historico: historico.slice(0, 4)
            };
            io.emit('atualizar-painel', dadosPainel);

            if (!err) {
                setTimeout(() => {
                    fs.unlink(caminhoAudio, () => {});
                }, 15000);
            }
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor ENOI rodando com sucesso! Acesse: http://127.0.0.1:${PORT}/tv.html`);
});
function atualizarTela(dados) {
    // Garante que nunca apareça "undefined", mesmo se vier de um JSON antigo
    const localExibicao = dados.ultima.destino || dados.ultima.guiche || "Local: ---";

    document.getElementById('lblSenha').innerText = dados.ultima.senha || "---";
    document.getElementById('lblNome').innerText = dados.ultima.nome || "Aguardando...";
    document.getElementById('lblGuiche').innerText = localExibicao;

    if (dados.ultima.audioUrl) {
        playerAudio.src = dados.ultima.audioUrl + "?t=" + new Date().getTime();
        playerAudio.play().catch(e => {
            console.log("Aguardando interação para áudio:", e);
        });
    }

    const containerHistorico = document.getElementById('listaHistorico');
    if (!dados.historico || dados.historico.length === 0) {
        containerHistorico.innerHTML = '<div style="text-align: center; color: #64748b; font-size: 1rem; margin-top: 20px;">Nenhum histórico recente</div>';
        return;
    }

    containerHistorico.innerHTML = dados.historico.map(item => {
        const localItem = item.destino || item.guiche || "---";
        return `
                <div class="historico-item">
                    <span class="hist-senha">${item.senha}</span>
                    <div class="hist-info">
                        <span class="hist-nome">${item.nome}</span>
                        <span class="hist-guiche">${localItem}</span>
                    </div>
                </div>
            `;
    }).join('');
}
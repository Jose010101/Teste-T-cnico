
const Form = document.getElementById("boletoform");
const mensagem = document.getElementById("mensagem");
const resumo = document.getElementById("resumo");
const btnPagar = document.getElementById("btnPagar");
const mensagemPagamento = document.getElementById("mensagemPagamento");
let boletoAtual = null;
let pagamentoEmAndamento = false;

const API_URL = "https://6ac8d83bfd7c536b1bd9f88f.mockapi.io/tecnico/v1/Boletos";
Form.addEventListener("submit", async (event) =>{
    event.preventDefault ();

    const codigo = document.getElementById("codigo").value.trim();

    resumo.hidden = true;

    mensagem.textContent = "Carregando dados...";

    try{
        const resposta = await fetch(
            `https://6ac8d83bfd7c536b1bd9f88f.mockapi.io/tecnico/v1/Boletos/${encodeURIComponent(codigo)}`
        );

        if(resposta.status ===404){
            mensagem.textContent ="Boleto não encontrado";
            return;
        }
        else if (!resposta.ok){
            throw new Error(`Erro HTTP: ${resposta.status}`);
        }

        //Aguardar consulta da API e salvar status do boleto
        const boleto = await resposta.json();
        boletoAtual = boleto;
        btnPagar.disabled = false;
        btnPagar.textContent = "Simular pagamento";
        mensagemPagamento.textContent = "";


        // Exibição de dados
        document.getElementById("beneficiario").textContent = boleto.beneficiario;
        document.getElementById("vencimento").textContent = boleto.vencimento;
        document.getElementById("valor").textContent = Number(boleto.valor).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
        document.getElementById("status").textContent = boleto.status;

        resumo.hidden = false;

        mensagem.textContent = "Boleto encontrado com sucesso!";
    } catch (erro){
        console.error(erro);

        mensagem.textContent = "Erro de conexão com a API. Tente novamente";
    }

    //Função de pagamento
    btnPagar.addEventListener("click", async () => {
    if (!boletoAtual || pagamentoEmAndamento) {
        return;
    }

    //Verificando se já está pago
    if (boletoAtual.status === "pago") {
        mensagemPagamento.textContent =
            "Este boleto já foi pago.";
        btnPagar.disabled = true;
        return;
    }

    //Caso o boleto esteja vencido, bloqueia o pagamento
    else if (boletoAtual.status === "vencido") {
        mensagemPagamento.textContent =
            "Boleto vencido. O pagamento está bloqueado nesta simulação.";
        return;
    }

    //Se for diferente de pendente e das condições listadas acima, bloqueia a ação
    else if(boletoAtual.status !== "pendente") {
        mensagemPagamento.textContent =
            "Não é possível pagar este boleto.";
        return;
    }

    const confirmar = window.confirm(
        `Deseja simular o pagamento de R$ ${
            Number(boletoAtual.valor).toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            })
        }?`
    );

    if (!confirmar) {
        mensagemPagamento.textContent =
            "Pagamento cancelado pelo usuário.";
        return;
    }

    pagamentoEmAndamento = true;
    btnPagar.disabled = true;
    btnPagar.textContent = "Processando...";
    mensagemPagamento.textContent = "Simulando pagamento...";

    try {
        // Confere novamente o status na API
        const consulta = await fetch(
            `${API_URL}/${encodeURIComponent(boletoAtual.id)}`
        );

        if (!consulta.ok) {
            throw new Error("Não foi possível confirmar o status do boleto.");
        }

        const boletoServidor = await consulta.json();

        if (boletoServidor.status !== "pendente") {
            boletoAtual = boletoServidor;

            document.getElementById("status").textContent =
                boletoAtual.status;

            mensagemPagamento.textContent =
                boletoAtual.status === "pago"
                    ? "Este boleto já foi pago."
                    : "O boleto não está mais pendente.";

            return;
        }

        // Atualiza o status na MockAPI
        const resposta = await fetch(
            `${API_URL}/${encodeURIComponent(boletoAtual.id)}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    status: "pago"
                })
            }
        );

        if (!resposta.ok) {
            throw new Error("A API não conseguiu atualizar o boleto.");
        }

        const boletoAtualizado = await resposta.json();

        // Atualiza a interface com a resposta da API
        boletoAtual = boletoAtualizado;

        document.getElementById("status").textContent =
            boletoAtualizado.status;

        if (boletoAtualizado.status !== "pago") {
            throw new Error("A API não confirmou o pagamento.");
        }

        mensagemPagamento.textContent =
            "Pagamento simulado com sucesso!";

    } catch (erro) {
        console.error(erro);

        mensagemPagamento.textContent =
            "Erro ao simular o pagamento. Tente novamente.";

    } finally {
        pagamentoEmAndamento = false;

        btnPagar.textContent = "Simular pagamento";

        btnPagar.disabled =
            !boletoAtual ||
            boletoAtual.status === "pago";
    }
    });
})
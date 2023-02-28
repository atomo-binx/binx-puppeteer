const api = require("./api");
const puppeteer = require("./puppeteer");

module.exports = {
  async run() {
    try {
      let accessToken = null;
      let pedidosBinx = [];

      // Realiza Login
      await api
        .post("/auth/login", {
          email: process.env.EMAIL,
          password: process.env.PASSWORD,
        })
        .then((response) => {
          accessToken = response.data.response.accessToken;
        });

      // Adquire lista de pedidos com transportadora Binx
      await api
        .get("/logistica/pedidos/transportadorabinx", {
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
        })
        .then((response) => {
          pedidosBinx = response.data.pedidos;
        });

      console.log("Quantidade de pedidos para alteração:", pedidosBinx.length);

      // Percorre cada um dos pedidos que necessitam de alteração
      for (const pedido of pedidosBinx) {
        try {
          console.log(
            "Iniciando procedimento de alteração para o pedido:",
            pedido.idpedidovenda
          );

          let pedidoBling = null;
          let melhorMetodo = null;

          // Adquire o melhor método de frete para este pedido
          await api
            .get(
              `logistica/pedidos/escolhermetodo?idPedidoVenda=${pedido.idpedidovenda}`,
              {
                headers: {
                  authorization: `Bearer ${accessToken}`,
                },
              }
            )
            .then((response) => {
              melhorMetodo = response.data.melhorMetodo;
            });

          await puppeteer.alterarTransportadora(
            pedido.idpedidovenda.toString(),
            melhorMetodo.servicoTraduzido
          );

          // Atualizar o valor de frete da transportadora escolhida no registro do pedido de venda no Binx
          await api.patch(
            "/logistica/pedidos/atualizarvalorfrete",
            {
              idPedidoVenda: pedido.idpedidovenda,
              valorFreteTransportadora: melhorMetodo.preco,
            },
            {
              headers: {
                authorization: `Bearer ${accessToken}`,
              },
            }
          );
        } catch (error) {
          console.log(
            `Não foi possível realizar a alteração para o pedido  ${pedido.idpedidovenda}:`,
            error.message
          );
        }
      }
    } catch (error) {
      console.log(error.message);
    }
  },

  delay() {
    return new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });
  },
};

const api = require("./api");
const puppeteer = require("./puppeteer");

const filename = __filename.slice(__dirname.length + 1) + " -";

module.exports = {
  async register() {
    console.log(filename, "Iniciando serviço de atualização de transportadora");
    this.run();

    setInterval(this.run, 10 * 60000);
  },

  async run() {
    console.log(filename, "Iniciando rotina de alteração de transportadoras");

    try {
      let accessToken = null;
      let pedidosBinx = [];

      // Realiza Login
      if (process.env.USE_AUTH === "true") {
        await api
          .post("/auth/login", {
            email: process.env.EMAIL,
            password: process.env.PASSWORD,
          })
          .then((response) => {
            accessToken = response.data.response.accessToken;
          });

        console.log(filename, "Login realizado");
      }

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

      console.log(
        filename,
        "Quantidade de pedidos para alteração:",
        pedidosBinx.length
      );

      // Percorre cada um dos pedidos que necessitam de alteração
      for (const pedido of pedidosBinx) {
        try {
          console.log(
            filename,
            "Iniciando procedimento de alteração para o pedido:",
            pedido.idpedidovenda
          );

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

          if (
            Object.prototype.hasOwnProperty.call(
              melhorMetodo,
              "servicoTraduzido"
            )
          ) {
            // Realizar a alteração da transportadora
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

            // Atualizar a situação desse pedido
            await api.get(
              `/pedidovenda/sincroniza?pedidos=${pedido.idpedidovenda}`,
              {
                headers: {
                  authorization: `Bearer ${accessToken}`,
                },
              }
            );
          }
        } catch (error) {
          console.log(
            `Não foi possível realizar a alteração para o pedido  ${pedido.idpedidovenda}:`,
            error.message
          );
        }
      }
    } catch (error) {
      console.log(filename, "Erro capturado:", error.message);
    }
  },
};

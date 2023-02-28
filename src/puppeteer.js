const fs = require("fs");
const puppeteer = require("puppeteer-extra");
const { executablePath } = require("puppeteer");

const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin());

const filename = __filename.slice(__dirname.length + 1) + " -";

// Constantes para serem utilizadas nos options dentro dos selects
const options = {
  dlog: "65776",
  correios: "63272",
  pac: "8899727307",
  sedex: "8899727306",
};

module.exports = {
  async removePopUp(page) {
    try {
      console.log(filename, "Remoção de pop up iniciada.");

      await page.waitForXPath(
        `//button[contains(text(), 'Não mostrar novamente')]`,
        {
          visible: true,
          timeout: 15000,
        }
      );

      const popUpButton = await page.$x(
        "//button[contains(text(), 'Não mostrar novamente')]"
      );
      await popUpButton[0].click();

      await page.waitForXPath(
        `//button[contains(text(), 'Não mostrar novamente')]`,
        {
          hidden: true,
          timeout: 15000,
        }
      );

      console.log(filename, "Remoção de pop up concluído.");
    } catch (error) {
      console.log(
        filename,
        `Não foi possível remover o pop up:`,
        error.message
      );
    }
  },

  async removerFiltroEmAberto(page) {
    try {
      console.log(filename, "Removendo filtro de Em Aberto.");

      await page.waitForXPath(
        `//span[text()='Em aberto']/following-sibling::span`,
        {
          visible: true,
          timeout: 15000,
        }
      );

      await page.waitForTimeout(1000);
      const popUpButton = await page.$x(
        `//span[text()='Em aberto']/following-sibling::span`
      );
      await popUpButton[0].click();

      await page.waitForXPath(
        `//span[text()='Em aberto']/following-sibling::span`,
        {
          hidden: true,
          timeout: 15000,
        }
      );

      console.log(filename, "Filtro de Em Aberto removido.");
    } catch (error) {
      console.log(
        filename,
        "Falha ao tentar remover filtro em aberto:",
        error.message
      );
    }
  },

  async alterarTransportadora(pedido, metodo) {
    try {
      const browser = await puppeteer.launch({
        headless: false,
        args: ["--no-sandbox", "--no-zygote"],
        executablePath: executablePath(),
      });

      const context = await browser.createIncognitoBrowserContext();

      try {
        let tempoInicio = new Date();

        const page = await context.newPage();

        await page.setDefaultTimeout(100000);

        // Realiza Login
        console.log(
          filename,
          `Pedido de Venda: ${pedido} -`,
          "Realizando Login"
        );
        await page.goto("https://www.bling.com.br/login");

        await page.waitForSelector("#username", { visible: true });
        await page.waitForSelector("#senha", { visible: true });

        await page.type("#username", process.env.BLING_USER);
        await page.type("#senha", process.env.BLING_PASSWORD);
        await page.click("button[name=enviar]");

        // Aguarda a homepage após login estar navegável
        // Para isso, aguardamos aparecer na tela o indicador do nome do usuario
        await page.waitForXPath(
          `//span[@class='menu-username hidden-xs hidden-sm']`,
          {
            visible: true,
          }
        );

        // Navegar para tela de pedidos
        console.log(
          filename,
          `Pedido de Venda: ${pedido} -`,
          "Navegando para tela de pedidos"
        );
        await page.goto("https://www.bling.com.br/vendas.php#list");

        // Aguarda pela barra de pesquisa
        await page.waitForSelector("#pesquisa-mini", { visible: true });

        // Buscar pelo pedido
        console.log(
          filename,
          `Pedido de Venda: ${pedido} -`,
          "Iniciando busca pelo pedido"
        );
        await page.type("#pesquisa-mini", pedido);
        await page.click("#btn-mini-search");

        // Limpar tag de filtro em aberto
        console.log(
          filename,
          `Pedido de Venda: ${pedido} -`,
          "Limpando filtro em aberto"
        );

        await this.removerFiltroEmAberto(page);

        // Adquirir Url do Pedido
        console.log(
          filename,
          `Pedido de Venda: ${pedido} -`,
          "Adquirindo URL do Pedido"
        );

        //Aguarda pela visibilidade de um checkbox seguido do número do pedido que queremos alterar
        await page.waitForXPath(
          `//span[contains(text(), '${pedido}')]/ancestor::tr//td[@class='checkbox-item']//div[@class='input-checkbox']//input`,
          { visible: true }
        );

        // Adquire o elemento correspondente ao checkbox seguido do número do pedido que queremos alterar
        const idElementHandler = await page.$x(
          `//span[contains(text(), '${pedido}')]/ancestor::tr//td[@class='checkbox-item']//div[@class='input-checkbox']//input`
        );

        const idValue = await page.evaluate(
          (x) => x.value,
          idElementHandler[0]
        );
        console.log(
          filename,
          `Pedido de Venda: ${pedido} -`,
          "ID para a URL: " + idValue
        );
        const targetUrl = `https://www.bling.com.br/vendas.php#edit/${idValue}`;

        // Navegando para a página do pedido
        await page.goto(targetUrl);

        // Aguarda a página de pedido ter sido realmente carregada

        // Aguarda aparecer um Option, dentro de um select que contenha o campo "Matriz"
        await page.waitForXPath(
          "//select[@id='idConfUnidadeNegocio']//option[contains(text(), 'Matriz')]"
        );

        // Verifica se foi aberto o pedido correto
        await page.waitForXPath("//input[@name='numeroPedido']", {
          visible: true,
        });

        const numeroPedidoElement = await page.$("#numeroPedido");

        const numeroPedido = await page.evaluate(
          (x) => x.value,
          numeroPedidoElement
        );
        console.log(
          filename,
          `Pedido de Venda: ${pedido} -`,
          `Página do pedido de venda aberto:`,
          numeroPedido
        );

        if (numeroPedido != pedido) {
          console.log(
            filename,
            `Pedido de Venda: ${pedido} -`,
            "Erro: o pedido aberto não é o mesmo que deve ser alterado."
          );

          return false;
        }

        // Aguarda pelo select de integração logística estar visível e populado de opções
        await page.waitForSelector("#integracaoLogistica", { visible: true });
        await page.waitForXPath(
          "//select[@id='integracaoLogistica']//option[@value='-1']"
        );
        await page.mainFrame().hover("#integracaoLogistica");

        switch (metodo) {
          case "dlog":
          case "DLog": {
            // Caso 1 - DLOG
            console.log(
              filename,
              `Pedido de Venda: ${pedido} -`,
              "Alterando para: DLOG"
            );
            await page.select("select#integracaoLogistica", options.dlog);
            await page.waitForTimeout(500);
            break;
          }

          case "pac":
          case "PAC": {
            // Caso 2 - Correios PAC
            console.log(
              filename,
              `Pedido de Venda: ${pedido} -`,
              "Alterando para: Correios PAC"
            );
            await page.select("select#integracaoLogistica", options.correios);
            await page.waitForTimeout(500);

            // Aguarda e posiciona no novo select que será renderizado
            await page.waitForXPath(
              "//select[@name='servicosLogistica[]']//option[@value='-1']"
            );
            const selectHoverPac = await page.waitForXPath(
              "//select[@name='servicosLogistica[]']"
            );
            await selectHoverPac.hover();

            // Seleciona o serviço
            await page.select(
              "select[name='servicosLogistica[]']",
              options.pac
            );
            await page.waitForTimeout(500);

            break;
          }
          case "sedex":
          case "SEDEX": {
            // Caso 2 - Correios sedex
            console.log(
              filename,
              `Pedido de Venda: ${pedido} -`,
              "Alterando para: Correios sedex"
            );
            await page.select("select#integracaoLogistica", options.correios);
            await page.waitForTimeout(500);

            // Aguarda e posiciona no novo select que será renderizado
            await page.waitForXPath(
              "//select[@name='servicosLogistica[]']//option[@value='-1']"
            );
            const selectHoversedex = await page.waitForXPath(
              "//select[@name='servicosLogistica[]']"
            );
            await selectHoversedex.hover();

            // Seleciona o serviço
            await page.select(
              "select[name='servicosLogistica[]']",
              options.sedex
            );
            await page.waitForTimeout(500);

            break;
          }
          default:
            console.log(
              filename,
              `Pedido de Venda: ${pedido} -`,
              "Erro ao alterar integração logística: não foi recebido um tipo válido de integração."
            );
            return false;
        }

        // Salvar pedido e fechar o browser
        await page.click("#botaoSalvar");

        // Aguarda voltar para a tela de busca novamente antes de fechar o browser
        await page.waitForSelector("#pesquisa-mini", { visible: true });

        // Fecha a página aberta
        await page.close();

        // Debug de tempo gasto na execução da alterçaão
        let tempoFinal = new Date();
        let tempoGasto = new Date(tempoFinal - tempoInicio)
          .toISOString()
          .slice(11, -1);
        console.log(
          filename,
          `Pedido de Venda: ${pedido} -`,
          "Tempo gasto na alteração de transporadora: ",
          tempoGasto
        );

        return true;
      } catch (error) {
        console.log(
          filename,
          `Pedido de Venda: ${pedido} -`,
          "Erro durante procedimento de alteração de transportadora no bling:",
          error.message
        );

        return false;
      } finally {
        console.log(
          filename,
          `Pedido de Venda: ${pedido} -`,
          "Procedimento finalizado no Puppeteer, fechando navegador"
        );
        // Procedimento finalizado com sucesso, fechar o navegador
        await browser.close();

        // Inicia verificação para checar se o processo do browser foi finalizado corretamente
        // if (browser && browser.process() != null) browser.process().kill("SIGINT");
        if (browser && browser.process() != null)
          browser.process().kill("SIGKILL");
      }
    } catch (error) {
      // O serviço não conseguiu iniciar uma nova instância do navegador
      console.log(
        filename,
        `Pedido de Venda: ${pedido} -`,
        "Erro ao iniciar instância do navegador pelo puppeteer:",
        error.message
      );
      return false;
    }
  },
};

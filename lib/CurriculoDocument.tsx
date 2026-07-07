import { Document, Page, Text, View, StyleSheet, Link } from "@react-pdf/renderer";
import { curriculo } from "./curriculo";

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  nome: {
    fontSize: 19,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  titulo: {
    fontSize: 10.5,
    color: "#444444",
    marginBottom: 6,
  },
  contatoLinha: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 10,
    fontSize: 8.5,
    color: "#444444",
  },
  secao: {
    marginBottom: 8,
  },
  secaoTitulo: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#dddddd",
    paddingBottom: 2,
  },
  paragrafo: {
    marginBottom: 3,
    lineHeight: 1.3,
    color: "#333333",
  },
  listaItem: {
    marginBottom: 2,
    color: "#333333",
  },
  itemBloco: {
    marginBottom: 5,
  },
  itemTitulo: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
  },
  itemSubtitulo: {
    fontSize: 9,
    color: "#555555",
    marginBottom: 2,
  },
  itemDescricao: {
    color: "#333333",
    lineHeight: 1.3,
  },
  stackLinha: {
    color: "#333333",
  },
});

export function CurriculoDocument() {
  return (
    <Document title={`Currículo - ${curriculo.nome}`} author={curriculo.nome}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.nome}>{curriculo.nome}</Text>
        <Text style={styles.titulo}>{curriculo.titulo}</Text>

        <View style={styles.contatoLinha}>
          <Link src={`mailto:${curriculo.contato.email}`} style={{ color: "#333333" }}>
            {curriculo.contato.email}
          </Link>
          <Text>{curriculo.contato.whatsapp}</Text>
          <Link src={`https://${curriculo.contato.linkedin}`} style={{ color: "#333333" }}>
            {curriculo.contato.linkedin}
          </Link>
        </View>

        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Sobre</Text>
          {curriculo.sobre.map((paragrafo) => (
            <Text key={paragrafo} style={styles.paragrafo}>
              {paragrafo}
            </Text>
          ))}
        </View>

        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Áreas de atuação</Text>
          {curriculo.areasDeAtuacao.map((area) => (
            <Text key={area} style={styles.listaItem}>
              • {area}
            </Text>
          ))}
        </View>

        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Stack técnica</Text>
          <Text style={styles.stackLinha}>{curriculo.stack.join(" • ")}</Text>
        </View>

        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Formação</Text>
          {curriculo.formacao.map((item) => (
            <View key={item.curso} style={styles.itemBloco} wrap={false}>
              <Text style={styles.itemTitulo}>{item.curso}</Text>
              <Text style={styles.itemSubtitulo}>
                {item.periodo} — {item.instituicao}
              </Text>
              <Text style={styles.itemDescricao}>{item.descricao}</Text>
            </View>
          ))}
        </View>

        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Projetos selecionados</Text>
          {curriculo.projetos.map((projeto) => (
            <View key={projeto.titulo} style={styles.itemBloco} wrap={false}>
              <Text style={styles.itemTitulo}>{projeto.titulo}</Text>
              <Text style={styles.itemDescricao}>{projeto.descricao}</Text>
              <Text style={styles.itemSubtitulo}>{projeto.tech}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}

/** Evento que abre o chat de qualquer ponto do site (ex.: link "Contato" do menu). */
export const ABRIR_CHAT = "abrir-chat";

export function abrirChat() {
  window.dispatchEvent(new Event(ABRIR_CHAT));
}

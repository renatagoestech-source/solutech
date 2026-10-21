const $ = (s, root=document) => root.querySelector(s);
const menuToggle = $('#menuToggle');
const mainNav = $('#mainNav');
if (menuToggle && mainNav) {
  menuToggle.addEventListener('click', () => {
    const open = mainNav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(open));
  });
  mainNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    mainNav.classList.remove('open'); menuToggle.setAttribute('aria-expanded','false');
  }));
}
const year = $('#year');
if (year) year.textContent = new Date().getFullYear();

const contactForm = $('#contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(contactForm);
    const name = String(data.get('name') || '').trim();
    const phone = String(data.get('phone') || '').trim();
    const service = String(data.get('service') || '').trim();
    const message = String(data.get('message') || '').trim();
    const feedback = $('#formFeedback');
    if (!name || !phone || !service || !message) {
      feedback.textContent = 'Preencha todos os campos obrigatórios.';
      return;
    }
    // Número fictício da demonstração. Troque pelo WhatsApp oficial antes de publicar.
    const whatsappNumber = '5587999990101';
    const text = `Olá, Solutech! Meu nome é ${name}.\\nTelefone: ${phone}\\nServiço: ${service}\\nDescrição: ${message}`;
    feedback.textContent = 'Abrindo o WhatsApp com sua mensagem. Confira os dados antes de enviar.';
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  });
}

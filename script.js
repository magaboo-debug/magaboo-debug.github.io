// Indique que le JavaScript fonctionne (sinon tout reste visible, sans animation)
document.documentElement.classList.add('js');
const reduireAnimations = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* =========================================================
   MENU MOBILE
   ========================================================= */
const boutonMenu = document.getElementById('bouton-menu');
const menu = document.getElementById('menu');

function fermerMenu() {
  menu.classList.remove('ouvert');
  boutonMenu.setAttribute('aria-expanded', 'false');
  boutonMenu.setAttribute('aria-label', 'Ouvrir le menu');
}
boutonMenu.addEventListener('click', () => {
  const ouvert = menu.classList.toggle('ouvert');
  boutonMenu.setAttribute('aria-expanded', String(ouvert));
  boutonMenu.setAttribute('aria-label', ouvert ? 'Fermer le menu' : 'Ouvrir le menu');
});
menu.querySelectorAll('a').forEach((lien) => lien.addEventListener('click', fermerMenu));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fermerMenu(); });
document.addEventListener('click', (e) => {
  if (!menu.contains(e.target) && !boutonMenu.contains(e.target)) fermerMenu();
});

/* ---------- Ombre du menu au défilement ---------- */
const entete = document.querySelector('.entete');
const majEntete = () => entete.classList.toggle('defile', window.scrollY > 8);
window.addEventListener('scroll', majEntete, { passive: true });
majEntete();

/* ---------- Élément actif du menu (pilule verte) ---------- */
const liens = [...document.querySelectorAll('.lien-menu')];
const sections = liens.map((l) => document.querySelector(l.getAttribute('href'))).filter(Boolean);

function majMenuActif() {
  const repere = window.scrollY + window.innerHeight * 0.35;
  let actuelle = sections[0];
  sections.forEach((s) => { if (s.offsetTop <= repere) actuelle = s; });
  if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) actuelle = sections[sections.length - 1];
  liens.forEach((l) => l.classList.toggle('actif', l.getAttribute('href') === '#' + actuelle.id));
}
window.addEventListener('scroll', majMenuActif, { passive: true });
window.addEventListener('resize', majMenuActif);
majMenuActif();

/* =========================================================
   COMPÉTENCES : bande de logos en boucle
   On recopie la liste une fois : quand la bande a défilé de moitié,
   elle repart du début sans que cela se voie.
   ========================================================= */
const piste = document.getElementById('piste-competences');
if (piste && !reduireAnimations) {
  [...piste.children].forEach((li) => {
    const copie = li.cloneNode(true);
    copie.setAttribute('aria-hidden', 'true');
    piste.appendChild(copie);
  });
}

/* =========================================================
   PROJETS : pile de cartes
   ========================================================= */
const pile = document.getElementById('pile');
const cartes = pile ? [...pile.querySelectorAll('.carte-pile')] : [];
const panneau = document.getElementById('panneau-projet');
const compteur = document.getElementById('compteur');
const curseur = document.getElementById('curseur-glisser');
const DUREE = reduireAnimations ? 0 : 380;   // durée de sortie d'une carte (ms)
let actuel = 0;          // index de la carte du dessus
let occupe = false;      // évite d'enchaîner les clics pendant une animation

// Position d'une carte dans la pile : 0 = dessus, 1 = juste dessous…
const position = (i) => (i - actuel + cartes.length) % cartes.length;

function placer() {
  cartes.forEach((carte, i) => {
    const p = position(i);
    const visible = Math.min(p, 2);
    carte.style.zIndex = String(cartes.length - p);
    carte.style.transform = `translateY(${-visible * 20}px) scale(${1 - visible * 0.05})`;
    carte.style.opacity = p > 2 ? '0' : '1';
    carte.classList.toggle('dessus', p === 0);
    carte.setAttribute('aria-hidden', p === 0 ? 'false' : 'true');
  });
  majPanneau();
}

function majPanneau() {
  const details = cartes[actuel].querySelector('.details');
  panneau.replaceChildren(...[...details.children].map((el) => el.cloneNode(true)));
  panneau.classList.remove('change');
  void panneau.offsetWidth;            // relance l'animation de fondu
  panneau.classList.add('change');
  compteur.textContent = `${actuel + 1} / ${cartes.length}`;
}

// Fait sortir la carte du dessus (sens = -1 vers la gauche, 1 vers la droite)
function suivant(sens = -1) {
  if (occupe || cartes.length < 2) return;
  occupe = true;
  const sortante = cartes[actuel];
  sortante.classList.remove('sans-transition');
  sortante.style.transform = `translateX(${sens * 130}%) rotate(${sens * 18}deg)`;
  sortante.style.opacity = '0';

  setTimeout(() => {
    actuel = (actuel + 1) % cartes.length;
    // La carte sortie revient au fond de la pile, sans être vue pendant le trajet
    sortante.classList.add('sans-transition');
    placer();
    const opaciteFinale = sortante.style.opacity;
    sortante.style.opacity = '0';
    void sortante.offsetWidth;
    sortante.classList.remove('sans-transition');
    sortante.style.opacity = opaciteFinale;
    occupe = false;
  }, DUREE);
}

// Ramène la dernière carte sortie par la gauche
function precedent() {
  if (occupe || cartes.length < 2) return;
  occupe = true;
  const i = (actuel - 1 + cartes.length) % cartes.length;
  const entrante = cartes[i];
  entrante.classList.add('sans-transition');
  entrante.style.zIndex = String(cartes.length + 1);
  entrante.style.transform = 'translateX(-130%) rotate(-18deg)';
  entrante.style.opacity = '0';
  void entrante.offsetWidth;
  entrante.classList.remove('sans-transition');
  actuel = i;
  placer();
  setTimeout(() => { occupe = false; }, DUREE);
}

if (pile && cartes.length) {
  placer();
  document.getElementById('suivant').addEventListener('click', () => suivant(-1));
  document.getElementById('precedent').addEventListener('click', precedent);
  pile.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); suivant(-1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); precedent(); }
  });

  /* ---------- Glisser à la souris ou au doigt ---------- */
  let glisse = null;   // { id, departX, dx, carte }

  pile.addEventListener('pointerdown', (e) => {
    const carte = e.target.closest('.carte-pile.dessus');
    if (!carte || occupe || (e.pointerType === 'mouse' && e.button !== 0)) return;
    glisse = { id: e.pointerId, departX: e.clientX, dx: 0, carte };
    carte.classList.add('sans-transition');
    pile.setPointerCapture(e.pointerId);
    curseur.classList.add('appuye');
  });

  pile.addEventListener('pointermove', (e) => {
    if (!glisse || e.pointerId !== glisse.id) return;
    glisse.dx = e.clientX - glisse.departX;
    glisse.carte.style.transform = `translateX(${glisse.dx}px) rotate(${glisse.dx / 18}deg)`;
  });

  function finGlisse(e) {
    if (!glisse || e.pointerId !== glisse.id) return;
    const { dx, carte } = glisse;
    glisse = null;
    carte.classList.remove('sans-transition');
    curseur.classList.remove('appuye');
    const seuil = Math.min(110, pile.offsetWidth * 0.22);
    if (e.type !== 'pointercancel' && Math.abs(dx) > seuil) suivant(Math.sign(dx));
    else placer();   // pas assez loin : la carte revient
  }
  pile.addEventListener('pointerup', finGlisse);
  pile.addEventListener('pointercancel', finGlisse);

  /* ---------- Rond « Glisser » qui suit la souris (ordinateur) ---------- */

  const sourisPrecise = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (sourisPrecise) {
    pile.classList.add('avec-curseur');
    pile.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      curseur.style.left = e.clientX + 'px';
      curseur.style.top = e.clientY + 'px';
      curseur.classList.toggle('visible', !!e.target.closest('.carte-pile.dessus') || !!glisse);
    });
    pile.addEventListener('pointerleave', () => curseur.classList.remove('visible'));
    window.addEventListener('scroll', () => curseur.classList.remove('visible'), { passive: true });
  }
}

/* =========================================================
   APPARITION DES SECTIONS AU DÉFILEMENT
   ========================================================= */
const elements = document.querySelectorAll('.apparition');
if ('IntersectionObserver' in window) {
  const observateur = new IntersectionObserver((entrees) => {
    entrees.forEach((entree) => {
      if (entree.isIntersecting) {
        entree.target.classList.add('visible');
        observateur.unobserve(entree.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  elements.forEach((el) => observateur.observe(el));
} else {
  elements.forEach((el) => el.classList.add('visible'));
}

/* ---------- Année du pied de page ---------- */
document.getElementById('annee').textContent = new Date().getFullYear();

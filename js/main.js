/* ============================================================
   DELICES MEDIAS GROUP — main.js
   Niveau 3 Immersif · Toutes les interactions JS
   ============================================================ */

'use strict';

/* ── Cursor personnalisé ── */
(function initCursor() {
  const cursor   = document.querySelector('.cursor');
  const follower = document.querySelector('.cursor-follower');
  if (!cursor || !follower) return;

  let mouseX = 0, mouseY = 0;
  let followerX = 0, followerY = 0;

  document.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursor.style.left = mouseX + 'px';
    cursor.style.top  = mouseY + 'px';
  });

  function animateFollower() {
    followerX += (mouseX - followerX) * 0.12;
    followerY += (mouseY - followerY) * 0.12;
    follower.style.left = followerX + 'px';
    follower.style.top  = followerY + 'px';
    requestAnimationFrame(animateFollower);
  }
  animateFollower();

  // Cursor interactions
  document.querySelectorAll('a, button, [role="button"], .bento-card, .card').forEach(el => {
    el.addEventListener('mouseenter', () => {
      cursor.classList.add('active');
      follower.classList.add('active');
    });
    el.addEventListener('mouseleave', () => {
      cursor.classList.remove('active');
      follower.classList.remove('active');
    });
  });
})();

/* ── Navigation sticky ── */
(function initNav() {
  const nav = document.querySelector('.nav');
  const progressBar = document.querySelector('.progress-bar');
  if (!nav) return;

  let lastScroll = 0;

  window.addEventListener('scroll', () => {
    const currentScroll = window.scrollY;

    // Hide/show nav
    if (currentScroll > 80) {
      nav.classList.add('scrolled');
      if (currentScroll > lastScroll && currentScroll > 300) {
        nav.classList.add('hidden');
      } else {
        nav.classList.remove('hidden');
      }
    } else {
      nav.classList.remove('scrolled', 'hidden');
    }
    lastScroll = currentScroll;

    // Progress bar
    if (progressBar) {
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docH > 0 ? (currentScroll / docH) * 100 : 0;
      progressBar.style.width = progress + '%';
    }
  }, { passive: true });
})();

/* ── Fullscreen menu ── */
(function initMenu() {
  const burger   = document.querySelector('.burger');
  const menu     = document.querySelector('.fullscreen-menu');
  const menuLinks = document.querySelectorAll('.fullscreen-menu nav a');
  if (!burger || !menu) return;

  function toggleMenu() {
    burger.classList.toggle('open');
    menu.classList.toggle('open');
    document.body.style.overflow = menu.classList.contains('open') ? 'hidden' : '';
  }

  burger.addEventListener('click', toggleMenu);
  menuLinks.forEach(link => link.addEventListener('click', () => {
    burger.classList.remove('open');
    menu.classList.remove('open');
    document.body.style.overflow = '';
  }));

  // Close on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && menu.classList.contains('open')) toggleMenu();
  });
})();

/* ── Scroll Reveal ── */
(function initReveal() {
  const elements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
  if (!elements.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        const delay = parseFloat(entry.target.dataset.delay || 0);
        setTimeout(() => entry.target.classList.add('revealed'), delay * 1000);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

  elements.forEach(el => observer.observe(el));
})();

/* ── Hero text animation ── */
(function initHeroAnimation() {
  const lines = document.querySelectorAll('.hero-title .line span');
  const heroTag  = document.querySelector('.hero-tag');
  const heroDesc = document.querySelector('.hero-desc');
  const heroActions = document.querySelector('.hero-actions');

  if (!lines.length) return;

  lines.forEach((line, i) => {
    line.style.transitionDelay = (0.3 + i * 0.15) + 's';
    line.style.transition = 'transform 0.9s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    setTimeout(() => { line.style.transform = 'translateY(0)'; }, 100);
  });

  if (heroTag) {
    heroTag.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    setTimeout(() => {
      heroTag.style.opacity = '1';
      heroTag.style.transform = 'translateY(0)';
    }, 200);
  }
  if (heroDesc) {
    heroDesc.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
    setTimeout(() => {
      heroDesc.style.opacity = '1';
      heroDesc.style.transform = 'translateY(0)';
    }, 800);
  }
  if (heroActions) {
    heroActions.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
    setTimeout(() => {
      heroActions.style.opacity = '1';
      heroActions.style.transform = 'translateY(0)';
    }, 1100);
  }
})();

/* ── Count-up animation ── */
(function initCountUp() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.count, 10);
      const suffix = el.dataset.suffix || '';
      const duration = 2000;
      const step = target / (duration / 16);
      let current = 0;

      const timer = setInterval(() => {
        current += step;
        if (current >= target) {
          current = target;
          clearInterval(timer);
        }
        el.textContent = Math.floor(current) + suffix;
      }, 16);

      observer.unobserve(el);
    });
  }, { threshold: 0.5 });

  counters.forEach(c => observer.observe(c));
})();

/* ── Parallax hero ── */
(function initParallax() {
  const heroBg = document.querySelector('.hero-bg img');
  if (!heroBg) return;

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const scrolled = window.scrollY;
        heroBg.style.transform = `translateY(${scrolled * 0.3}px)`;
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
})();

/* ── Back to top ── */
(function initBackToTop() {
  const btn = document.querySelector('.back-to-top');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 300);
  }, { passive: true });

  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
})();

/* ── Active nav link ── */
(function initActiveNav() {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .fullscreen-menu nav a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === path || (path === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
})();

/* ── Stagger cards on scroll ── */
(function initStaggerCards() {
  const grids = document.querySelectorAll('.card-grid, .bento-grid, .stagger-grid');
  if (!grids.length) return;

  grids.forEach(grid => {
    const cards = grid.querySelectorAll('.card, .bento-card, .testimonial-card');
    cards.forEach((card, i) => {
      card.style.transitionDelay = (i * 0.1) + 's';
      card.classList.add('reveal');
    });
  });

  // Re-init observer for newly classed elements
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.05 });

  document.querySelectorAll('.bento-grid .bento-card, .card-grid .card').forEach(el => {
    observer.observe(el);
  });
})();

/* ── Horizontal scroll drag ── */
(function initHScroll() {
  const sliders = document.querySelectorAll('.h-scroll-wrap');
  sliders.forEach(slider => {
    let isDown = false;
    let startX, scrollLeft;

    slider.addEventListener('mousedown', e => {
      isDown = true;
      startX = e.pageX - slider.offsetLeft;
      scrollLeft = slider.scrollLeft;
    });
    slider.addEventListener('mouseleave', () => isDown = false);
    slider.addEventListener('mouseup', () => isDown = false);
    slider.addEventListener('mousemove', e => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - slider.offsetLeft;
      const walk = (x - startX) * 1.5;
      slider.scrollLeft = scrollLeft - walk;
    });
  });
})();

/* ── Contact form handler ── */
(function initContactForm() {
  const form = document.querySelector('#contact-form');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    const btn = form.querySelector('[type="submit"]');
    const original = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Envoi en cours...';
    btn.disabled = true;

    // Simulate — replace with real backend/EmailJS
    setTimeout(() => {
      btn.innerHTML = '<i class="fa-solid fa-check"></i> Message envoyé !';
      btn.style.background = '#25D366';
      form.reset();
      setTimeout(() => {
        btn.innerHTML = original;
        btn.disabled = false;
        btn.style.background = '';
      }, 3000);
    }, 1500);
  });
})();

/* ── GSAP ScrollTrigger (Niveau 3) ── */
(function initGSAP() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  // Pin section animation (si présente)
  const pinSection = document.querySelector('.gsap-pin');
  if (pinSection) {
    gsap.to(pinSection.querySelector('.gsap-pin-content'), {
      x: () => -(pinSection.querySelector('.gsap-pin-content').scrollWidth - window.innerWidth),
      ease: 'none',
      scrollTrigger: {
        trigger: pinSection,
        start: 'top top',
        end: () => '+=' + pinSection.querySelector('.gsap-pin-content').scrollWidth,
        pin: true,
        scrub: 1,
        anticipatePin: 1,
      }
    });
  }

  // Text reveal via GSAP
  document.querySelectorAll('.gsap-text-reveal').forEach(el => {
    gsap.from(el, {
      yPercent: 110,
      duration: 1.2,
      ease: 'power4.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
      }
    });
  });

  // Parallax images
  document.querySelectorAll('.gsap-parallax').forEach(img => {
    gsap.to(img, {
      yPercent: -20,
      ease: 'none',
      scrollTrigger: {
        trigger: img,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      }
    });
  });
})();

/* ── Color shift by section ── */
(function initColorShift() {
  const sections = document.querySelectorAll('[data-bg]');
  if (!sections.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        document.documentElement.style.setProperty('--current-bg', entry.target.dataset.bg);
      }
    });
  }, { threshold: 0.5 });

  sections.forEach(s => observer.observe(s));
})();

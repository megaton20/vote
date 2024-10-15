// script.js
// Handle scroll event to change navbar style
window.addEventListener('scroll', function() {
  const navbar = document.getElementById('navbar');
  const navLinks = document.querySelectorAll('.nav-link');
  
  if (window.scrollY > 350) { // Adjust threshold as needed
      navbar.classList.add('scrolled');
      navLinks.forEach(navLink => {
        navLink.classList.add('text-light');
      });
  } else {
      navbar.classList.remove('scrolled');
      navLinks.forEach(navLink => {
        navLink.classList.remove('text-light');
      });
  }
});

  /**
   * Scroll top button
   */
  let scrollTop = document.querySelector('.scroll-top');

  function toggleScrollTop() {
    if (scrollTop) {
      window.scrollY > 100 ? scrollTop.classList.add('active') : scrollTop.classList.remove('active');
    }
  }
  scrollTop.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });

  window.addEventListener('load', toggleScrollTop);
  document.addEventListener('scroll', toggleScrollTop);



  /**
   * Animation on scroll function and init
   */
  function aosInit() {
    AOS.init({
      duration: 600,
      easing: 'ease-in-out',
      once: true,
      mirror: false
    });
  }
  window.addEventListener('load', aosInit);

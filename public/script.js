// script.js

window.addEventListener('scroll', function() {
  const navbar = document.getElementById('navbar');
  if (window.scrollY > 50) { // Adjust threshold as needed
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
});
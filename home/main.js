var typed = new Typed('#typed', {
    stringsElement: '#typed-strings',
    typeSpeed: 80,
    showCursor: false,
});

const screenWidth = document.body.clientWidth;
const screenheight = document.body.clientHeight;


anime({
  targets: '#reverse-engineering',
  translateX: [-screenWidth, 0],
  easing: "easeInOutExpo",
  duration: 1000
});

{{/* Twitter, Github */}}
anime({
  targets: '#twitter',
  opacity: [0, 1],
  easing: "easeInOutExpo",
  duration: 1000,
});
anime({
  targets: '#github',
  opacity: [0, 1],
  easing: "easeInOutExpo",
  duration: 1000,
  delay: 150,
});
anime({
  targets: '#linkedin',
  opacity: [0, 1],
  easing: "easeInOutExpo",
  duration: 1000,
  delay: 350,
});
anime({
  targets: '#cv',
  opacity: [0, 1],
  easing: "easeInOutExpo",
  duration: 1000,
  delay: 500,
});


anime({
  targets: '#svg-re',
  translateX: [-screenWidth, 0],
  easing: "easeInOutExpo",
  duration: 1000,
  delay: 100,
});

anime({
  targets: '#tooling',
  translateY: [-screenheight, 0],
  easing: "easeInOutExpo",
  duration: 1000,
  delay: 200,

});

anime({
  targets: '#svg-tooling',
  translateY: [-screenheight, 0],
  easing: "easeInOutExpo",
  duration: 1000,
  delay: 300,

});


anime({
  targets: '#code-obfuscation',
  translateY: [screenheight, 0],
  easing: "easeInOutExpo",
  duration: 1000,
  delay: 400,
});

anime({
  targets: '#svg-obfu',
  translateY: [screenheight, 0],
  easing: "easeInOutExpo",
  duration: 1000,
  delay: 500,
});


anime({
  targets: '#training',
  translateX: [screenWidth, 0],
  easing: "easeInOutExpo",
  duration: 1000,
  delay: 600,
});

anime({
  targets: '#svg-training',
  translateX: [screenWidth, 0],
  easing: "easeInOutExpo",
  duration: 1000,
  delay: 700,
});


const CONFIG = {
    LINKS: {
        telegramDM: "https://t.me/SyroxZen",
        telegramChannel: "https://t.me/SI_CODEX", 
        instagram: "https://www.instagram.com/sunny_codex?stkn=MWgydGxhZDQwa2lxYw==",
        limited: "https://t.me/Sunnybotmaker_bot"
    }
};

document.addEventListener("DOMContentLoaded", () => {
    
    const setLink = (id, url) => {
        const el = document.getElementById(id);
        if(el && url !== "") el.href = url;
    };
    
    setLink("btn-tg-dm", CONFIG.LINKS.telegramDM);
    setLink("btn-tg-channel", CONFIG.LINKS.telegramChannel);
    setLink("btn-insta", CONFIG.LINKS.instagram);
    setLink("btn-backup", CONFIG.LINKS.limited);

    const mobileBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    
    mobileBtn.addEventListener('click', () => { navLinks.classList.toggle('show'); });
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => { navLinks.classList.remove('show'); });
    });

    // Scroll Reveal Observer
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

    window.addEventListener('scroll', () => {
        const nav = document.querySelector('.glass-nav');
        if (window.scrollY > 50) nav.classList.add('scrolled');
        else nav.classList.remove('scrolled');
    });

    // Typing Animation
    const roleText = ["App Developer", "Game Developer", "Telegram Bot Dev", "UI/UX Designer"];
    let roleIdx = 0, charIdx = 0, isDel = false;
    const roleSpan = document.getElementById("role-typing");

    function typeRole() {
        const cur = roleText[roleIdx];
        roleSpan.textContent = isDel ? cur.substring(0, charIdx - 1) : cur.substring(0, charIdx + 1);
        charIdx += isDel ? -1 : 1;
        
        let speed = isDel ? 40 : 100;
        if (!isDel && charIdx === cur.length) { speed = 2000; isDel = true; }
        else if (isDel && charIdx === 0) { isDel = false; roleIdx = (roleIdx + 1) % roleText.length; speed = 500; }
        
        setTimeout(typeRole, speed);
    }
    setTimeout(typeRole, 800);

    const termLines = ["> system.boot()", "> loading modules...", "> identity: verified", "> status: ONLINE"];
    let tlIdx = 0, tcIdx = 0;
    const termSpan = document.getElementById("terminal-typing");

    function typeTerm() {
        if (tlIdx < termLines.length) {
            if (tcIdx < termLines[tlIdx].length) {
                termSpan.innerHTML += termLines[tlIdx].charAt(tcIdx++);
                setTimeout(typeTerm, 30);
            } else {
                termSpan.innerHTML += "<br>"; tlIdx++; tcIdx = 0;
                setTimeout(typeTerm, 400);
            }
        }
    }
    
    const aboutObserver = new IntersectionObserver((entries) => {
        if(entries[0].isIntersecting) { setTimeout(typeTerm, 300); aboutObserver.disconnect(); }
    });
    const aboutSec = document.getElementById('about');
    if(aboutSec) aboutObserver.observe(aboutSec);

    // Static Twinkling Stars (Sky effect)
    const canvas = document.getElementById('star-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth; 
    canvas.height = window.innerHeight;

    let stars = [];
    class Star {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 1.5 + 0.5; // Choto size
            this.opacity = Math.random();
            this.fadeDir = Math.random() > 0.5 ? 1 : -1;
            this.fadeSpeed = Math.random() * 0.015 + 0.005; 
        }
        update() {
            // Shudhu opacity change hobe (twinkle effect), position ek thakbe
            this.opacity += this.fadeSpeed * this.fadeDir;
            if (this.opacity >= 1) {
                this.opacity = 1;
                this.fadeDir = -1;
            }
            if (this.opacity <= 0.1) {
                this.opacity = 0.1;
                this.fadeDir = 1;
                // Ektu position change kora jete pare jate random lage, but static rakhte chaile evabei thakbe
            }
        }
        draw() {
            ctx.fillStyle = `rgba(255, 215, 0, ${this.opacity})`; // Yellow star color
            ctx.shadowBlur = 6;
            ctx.shadowColor = `rgba(229, 192, 92, ${this.opacity})`; // Glowing shadow
            ctx.beginPath(); 
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); 
            ctx.fill();
            ctx.shadowBlur = 0; // Performance er jonno reset
        }
    }

    function initStars() { 
        stars = []; 
        const starCount = window.innerWidth < 768 ? 100 : 250; // Beshi number of stars
        for (let i=0; i<starCount; i++) stars.push(new Star()); 
    }
    
    function animateStars() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        stars.forEach(s => { s.update(); s.draw(); });
        requestAnimationFrame(animateStars);
    }
    
    initStars(); animateStars();
    window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; initStars(); });
});
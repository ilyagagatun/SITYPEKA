/* Конфетти в стиле «Ситуации»: розовые, оранжевые, зелёные кусочки с чёрной обводкой.
   Использование: launchConfetti(); */
(function () {
    const canvas = document.getElementById('confettiCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const COLORS = ['#FF85C0', '#FF4D94', '#FF6B00', '#73D13D', '#B37FEB', '#69C0FF', '#FFF6BD'];
    const GRAVITY = 0.32;
    const DRAG = 0.985;

    let particles = [];
    let rafId = null;
    let lastTime = 0;
    let width = 0;
    let height = 0;

    function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function rand(min, max) {
        return min + Math.random() * (max - min);
    }

    // angle — направление выстрела в градусах (-90 = вверх), spread — разброс
    function burst(x, y, count, angle, spread, power) {
        for (let i = 0; i < count; i++) {
            const a = (angle + rand(-spread, spread)) * Math.PI / 180;
            const speed = rand(power * 0.45, power);
            particles.push({
                x, y,
                vx: Math.cos(a) * speed,
                vy: Math.sin(a) * speed,
                size: rand(7, 13),
                color: COLORS[Math.floor(Math.random() * COLORS.length)],
                shape: Math.random() < 0.3 ? 'circle' : 'rect',
                rot: rand(0, Math.PI * 2),
                vr: rand(-0.25, 0.25),
                tilt: rand(0, Math.PI * 2),
                vt: rand(0.1, 0.3),
                life: rand(110, 170)
            });
        }
    }

    function rain(count) {
        for (let i = 0; i < count; i++) {
            burst(rand(0, width), rand(-40, -10), 1, 90, 25, rand(2, 6));
        }
    }

    function drawParticle(p) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(1, Math.cos(p.tilt)); // эффект переворота кусочка
        ctx.globalAlpha = Math.min(1, p.life / 30);
        ctx.fillStyle = p.color;
        ctx.strokeStyle = '#141414';
        ctx.lineWidth = 1.5;
        if (p.shape === 'circle') {
            ctx.beginPath();
            ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        } else {
            ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
            ctx.strokeRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        }
        ctx.restore();
    }

    function frame(now) {
        const dt = Math.min((now - lastTime) / 16.67, 3);
        lastTime = now;
        ctx.clearRect(0, 0, width, height);

        particles = particles.filter(p => p.life > 0 && p.y < height + 40);
        particles.forEach(p => {
            p.vx *= DRAG;
            p.vy = p.vy * DRAG + GRAVITY * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.rot += p.vr * dt;
            p.tilt += p.vt * dt;
            p.life -= dt;
            drawParticle(p);
        });

        if (particles.length) {
            rafId = requestAnimationFrame(frame);
        } else {
            rafId = null;
            ctx.clearRect(0, 0, width, height);
        }
    }

    function start() {
        if (rafId === null) {
            lastTime = performance.now();
            rafId = requestAnimationFrame(frame);
        }
    }

    window.launchConfetti = function () {
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        resize();

        // 1) залп из центра колеса
        const wheel = document.getElementById('wheelCanvas');
        let cx = width / 2;
        let cy = height / 2;
        if (wheel) {
            const r = wheel.getBoundingClientRect();
            if (r.width) { cx = r.left + r.width / 2; cy = r.top + r.height / 2; }
        }
        burst(cx, cy, 90, -90, 60, 20);

        // 2) пушки из нижних углов
        setTimeout(() => {
            burst(0, height, 55, -60, 20, 24);
            burst(width, height, 55, -120, 20, 24);
            start();
        }, 180);

        // 3) дождь сверху
        setTimeout(() => { rain(50); start(); }, 450);

        start();
    };

    window.addEventListener('resize', () => { if (particles.length) resize(); });
})();

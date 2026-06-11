window.initPopcatEvents = function() {
    const popcatImg = document.getElementById('popcat-img');
    const popcatSound = document.getElementById('popcat-sound');
    const popcatScore = document.getElementById('popcat-score');
    let score = 0;

    const catCloseUrl = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTerRVtsqtqpRscjFIa4yKtVl5XheMoJSvCQA&s';
    const catOpenUrl = 'https://i1.sndcdn.com/artworks-ld16iH1pftf382OC-N4nA9g-t500x500.jpg';
    
    if (popcatImg && popcatSound && popcatScore) {
        popcatImg.src = catCloseUrl;
        popcatSound.src = 'https://www.myinstants.com/media/sounds/pop-cat-original-meme_3.mp3'; 

        const popAction = () => {
            popcatImg.src = catOpenUrl;
            popcatImg.style.transform = 'scale(1.1)';
            popcatSound.currentTime = 0; 
            popcatSound.play().catch(e => console.log('Audio play failed', e));
            score++;
            popcatScore.innerText = score;
        };

        const unpopAction = () => {
            popcatImg.src = catCloseUrl;
            popcatImg.style.transform = 'scale(1)';
        };

        popcatImg.addEventListener('mousedown', popAction);
        popcatImg.addEventListener('mouseup', unpopAction);
        popcatImg.addEventListener('mouseleave', unpopAction); 
        popcatImg.addEventListener('touchstart', (e) => { e.preventDefault(); popAction(); });
        popcatImg.addEventListener('touchend', unpopAction);
    }
};

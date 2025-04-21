document.addEventListener('DOMContentLoaded', () => {
  // Load YAML data from the data.yaml file
  fetch('data.yaml')
    .then(response => response.text())
    .then(yamlText => {
      const allSentences = jsyaml.load(yamlText);
      
      // Check if we're on the main game screen (not the topic selection screen)
      const app = document.getElementById('app');
      if (app && window.getComputedStyle(app).display === 'block') {
        initializeGame(allSentences);
      }
      
      // Listen for the startGame event from index.html
      document.addEventListener('startGame', () => {
        console.log('Start Game event received. Starting game with topics:', window.selectedTopics);
        initializeGame(allSentences);
      });
    })
    .catch(error => {
      console.error('Error loading YAML data:', error);
      document.getElementById('sentenceContainer').textContent = 'Error loading sentences. Please refresh the page.';
    });
});

function initializeGame(allSentences) {
  // Filter sentences based on selected topics if available
  let filteredSentences = allSentences;
  
  if (window.selectedTopics && window.selectedTopics.length > 0) {
    console.log('Filtering sentences by topics:', window.selectedTopics);
    // Convert all selected topics to lowercase once for efficiency
    const lowerTopics = window.selectedTopics.map(topic => topic.toLowerCase());
    
    filteredSentences = allSentences.filter(sentence => {
      // Handle case-insensitive topic matching
      if (!sentence.topic) return false;
      const sentenceTopic = sentence.topic.toLowerCase();
      return lowerTopics.includes(sentenceTopic);
    });
    
    console.log(`Found ${filteredSentences.length} sentences matching selected topics`);
    
    // If no sentences match the selected topics, fall back to all sentences
    if (filteredSentences.length === 0) {
      console.warn('No sentences found for the selected topics. Using all sentences.');
      filteredSentences = allSentences;
    }
  }
  
  // Reset counters explicitly when starting a new game
  window.correctCount = 0;
  window.incorrectCount = 0;
  
  const hintSound = new Audio('meow.mp3'); hintSound.volume = 0.08; // Reduced volume from 0.15 to 0.08
  const correctSound = new Audio('correct.wav'); correctSound.volume = 0.8; // Set to 80% volume
  const harpSound = new Audio('harp.wav'); harpSound.volume = 0.9; // Set to 90% volume
  const incorrectSound = new Audio('incorrect.wav'); incorrectSound.volume = 0.3;
  const wrongSound = new Audio('wrong.wav'); wrongSound.volume = 0.3;
  const typeSound = new Audio('type.wav'); typeSound.loop = true; typeSound.volume = 0.25;
  const meowSound = new Audio('meow.mp3'); meowSound.volume = 0.1;
  
  // Frame-based animation parameters and variables
  const typingFrames = ['type2.png', 'type3.png', 'type4.png']; // Removed type1.png from sequence
  let frameIndex = 0;
  let animationInterval;
  const frameDelay = 150; // milliseconds between frames (adjust for speed)
  
  // Chat animation variables and frames
  const chatFrames = ['chat1.png', 'chat2.png', 'chat3.png'];
  let chatFrameIndex = 0;
  let chatAnimationInterval;
  const chatFrameDelay = 150; // milliseconds between chat frames
  
  // Function to animate cat talking using individual frames
  function animateCatTalking(imgElement, duration = 800) {
    // Clear any existing animation
    if (chatAnimationInterval) {
      clearInterval(chatAnimationInterval);
      chatAnimationInterval = null;
    }
    
    if (animationInterval) {
      clearInterval(animationInterval);
      animationInterval = null;
    }
    
    // Reset to first frame
    chatFrameIndex = 0;
    imgElement.src = chatFrames[chatFrameIndex];
    
    // Create animation interval that cycles through frames
    chatAnimationInterval = setInterval(() => {
      chatFrameIndex = (chatFrameIndex + 1) % chatFrames.length;
      imgElement.src = chatFrames[chatFrameIndex];
    }, chatFrameDelay);
    
    // If duration is provided, stop the animation after that time
    if (duration > 0) {
      setTimeout(() => {
        if (chatAnimationInterval) {
          clearInterval(chatAnimationInterval);
          chatAnimationInterval = null;
          imgElement.src = 'catstill.png';
        }
      }, duration);
    }
    
    return chatAnimationInterval;
  }
  
  // Function to stop the chat animation
  function stopChatAnimation() {
    if (chatAnimationInterval) {
      clearInterval(chatAnimationInterval);
      chatAnimationInterval = null;
    }
  }
  
  // Function to animate cat using individual frames
  function animateCatTyping(imgElement, isPlaying = true) {
    // Clear any existing animation
    if (animationInterval) {
      clearInterval(animationInterval);
      animationInterval = null;
    }
    
    // If not playing animation, just return
    if (!isPlaying) return;
    
    // Reset to first frame
    frameIndex = 0;
    imgElement.src = typingFrames[frameIndex];
    
    // Create animation interval that cycles through frames
    animationInterval = setInterval(() => {
      frameIndex = (frameIndex + 1) % typingFrames.length;
      imgElement.src = typingFrames[frameIndex];
    }, frameDelay);
    
    return animationInterval;
  }
  
  // Function to stop the frame animation
  function stopCatAnimation() {
    if (animationInterval) {
      clearInterval(animationInterval);
      animationInterval = null;
    }
  }
  
  let soundEnabled = true;
  let hintUsed = false;
  const positiveMessages = ["Correct!","Yes!","Exactly!","Great!","Well done!","You've got this!","Nice one!","That's it!","Good one!","You are doing great!","Superb!","Excellent!","Absolutely!","Getting the hang of it!","Purrr-fect!","Keep up the great work!"];

  function shuffle(arr){return arr.slice().sort(()=>Math.random()-0.5);}
  
  // Get the user-selected sentence count or default to 20
  const sentenceCount = window.sentenceCount || 20;
  console.log(`Using ${sentenceCount} sentences for this game session.`);
  
  // Make sure the count is within bounds
  const finalCount = Math.min(Math.max(1, sentenceCount), 100);
  
  // Apply the user-defined sentence count
  let sentences = shuffle(filteredSentences).slice(0, finalCount);
  
  let idx = 0, correctCount = window.correctCount || 0, incorrectCount = window.incorrectCount || 0, attempts = 0;
  let consecutiveCorrect = 0; // Track consecutive correct answers
  
  // DOM elements
  const charImg = document.getElementById('charImg');
  const sentDiv = document.getElementById('sentenceContainer');
  const form = document.getElementById('answerForm');
  const input = document.getElementById('answerInput');
  const submitBtn = document.getElementById('submitBtn');
  const continueBtn = document.getElementById('continueBtn');
  const hintBtn = document.getElementById('hintBtn');
  const restartBtn = document.getElementById('restartBtn');
  const toggleBtn = document.getElementById('toggleSoundBtn');
  const speechBubble = document.getElementById('speechBubble');
  const thoughtBubble = document.getElementById('thoughtBubble');
  const progress = document.getElementById('progress');
  const progressFill = document.getElementById('progressFill');
  const app = document.getElementById('app');
  const exclamation = document.getElementById('exclamation');
  const correctCountDisplay = document.getElementById('correctCount');
  const incorrectCountDisplay = document.getElementById('incorrectCount');
  const scoreCounter = document.getElementById('scoreCounter');
  
  // Initialize the UI
  if (scoreCounter) scoreCounter.style.display = 'block';
  updateFooter(); // Initialize footer when starting the game

  // Function to update the footer display
  function updateFooter() {
    if (correctCountDisplay) correctCountDisplay.textContent = correctCount;
    if (incorrectCountDisplay) incorrectCountDisplay.textContent = incorrectCount;
    // Store the current count in window for persistence across game sessions
    window.correctCount = correctCount;
    window.incorrectCount = incorrectCount;
  }

  // Function to show exclamation mark with animation
  function showExclamation() {
    if (!exclamation) return;
    
    // Reset animation if it was already playing
    exclamation.style.animation = 'none';
    exclamation.offsetHeight; // Force reflow
    
    // Set and play the animation
    exclamation.style.opacity = '0';
    exclamation.style.animation = 'popIn 0.4s forwards'; // Faster animation for quick pop-in/out
  }

  // Function to animate text in bubble and cat speaking
  function animateSpeechBubble(bubble, text, callback, keepCatState = false) {
    if (!bubble || !charImg) return;
    
    // Clear previous content and create span for typing effect
    bubble.innerHTML = '';
    const textSpan = document.createElement('span');
    textSpan.className = 'typing-effect';
    textSpan.textContent = text;
    bubble.appendChild(textSpan);
    
    // Show the speech bubble
    bubble.style.display = 'block';
    bubble.classList.add('show');
    
    // Change cat to talking animation if not already in a special state
    if (!keepCatState) {
      animateCatTalking(charImg);
    }
    
    // Set timeout for when animation completes (matching the CSS animation duration)
    const animationDuration = 600; // Faster typing animation (was 800ms)
    setTimeout(() => {
      // Return cat to previous state if not keeping current state
      if (!keepCatState) {
        charImg.src = 'catstill.png';
      }
      
      // Execute callback if provided
      if (callback && typeof callback === 'function') {
        callback();
      }
    }, animationDuration);
  }

  function typeSentence(text, cb) {
    sentDiv.textContent = "";
    
    // Start the frame-based typing animation
    animateCatTyping(charImg, true);
    
    if (soundEnabled) typeSound.play();
    let i = 0, t = setInterval(() => {
      if (i < text.length) sentDiv.textContent += text[i++];
      else {
        clearInterval(t);
        typeSound.pause();
        // Stop the typing animation
        stopCatAnimation();
        charImg.src = 'catstill.png';
        cb();
      }
    }, 40);
  }

  function load(){
    attempts = 0;
    hintUsed = false;
    hintBtn.disabled = false;
    hintBtn.textContent = '🐾 Hint';
    speechBubble.style.display = thoughtBubble.style.display = 'none';
    continueBtn.style.display = 'none';
    restartBtn.style.display = 'none';
    form.style.display = 'flex';
    input.disabled = submitBtn.disabled = true;
    input.value = "";
    if (exclamation) {
      exclamation.style.opacity = '0';
      exclamation.style.animation = 'none';
    }

    if(idx < sentences.length){
      progress.textContent = `Sentence ${idx+1} of ${sentences.length}`;
      progressFill.style.width = `${(idx/sentences.length)*100}%`;
      typeSentence(sentences[idx].sentence, ()=>{
        input.disabled = submitBtn.disabled = false;
        input.focus();
      });
    } else {
      form.style.display = 'none';
      
      // Calculate final score - ensure missed count is accurate
      // The missed count should be total questions minus correct answers
      incorrectCount = sentences.length - correctCount;
      
      sentDiv.innerHTML =
        `Game Over! 🎉<br><br>`+
        `✅ Correct: ${correctCount}<br>`+
        `❌ Missed: ${incorrectCount}<br>`+
        `📊 Accuracy: ${Math.round((correctCount/sentences.length)*100)}%`;
      progress.textContent = `Final Score: ${correctCount} / ${sentences.length}`;
      progressFill.style.width = '100%';
      restartBtn.style.display = 'inline-block';
      
      // Update footer one last time at game end
      updateFooter();
      
      // End-game animations based on score
      handleGameOver();
    }
  }

  function nextQuestion(){ idx++; load(); }

  // Event listeners
  continueBtn.onclick = () => { 
    continueBtn.style.display='none'; 
    nextQuestion(); 
  };
  
  restartBtn.onclick = () => {
    // Instead of just clearing variables, completely reinitialize the game
    // This ensures a fresh start similar to the first playthrough
    
    // First, reload the YAML data to ensure we start fresh
    fetch('data.yaml')
      .then(response => response.text())
      .then(yamlText => {
        const freshSentences = jsyaml.load(yamlText);
        
        // Reset DOM elements to initial state
        if (scoreCounter) scoreCounter.style.display = 'block';
        if (exclamation) {
          exclamation.style.opacity = '0';
          exclamation.style.animation = 'none';
        }
        
        speechBubble.style.display = 'none';
        speechBubble.classList.remove('show');
        speechBubble.textContent = '';
        
        thoughtBubble.style.display = 'none';
        thoughtBubble.classList.remove('show');
        thoughtBubble.textContent = '';
        
        // Reset audio objects
        incorrectSound.pause();
        incorrectSound.currentTime = 0;
        wrongSound.pause();
        wrongSound.currentTime = 0;
        correctSound.pause();
        correctSound.currentTime = 0;
        typeSound.pause();
        typeSound.currentTime = 0;
        
        // Stop any running animation
        stopCatAnimation();
        
        // Reset game state
        idx = 0;
        correctCount = 0;
        incorrectCount = 0;
        consecutiveCorrect = 0;
        attempts = 0;
        hintUsed = false;
        
        // Reset the form
        form.style.display = 'flex';
        input.disabled = true;
        submitBtn.disabled = true;
        input.value = '';
        
        // Reset buttons
        continueBtn.style.display = 'none';
        restartBtn.style.display = 'none';
        hintBtn.disabled = false;
        hintBtn.textContent = '🐾 Hint';
        
        // Reset global counters
        window.correctCount = 0;
        window.incorrectCount = 0;
        
        // Reset the score display in DOM
        if (correctCountDisplay) correctCountDisplay.textContent = '0';
        if (incorrectCountDisplay) incorrectCountDisplay.textContent = '0';
        
        // User chose to replay, so keep the same selected topics
        // and keep the same sentence count that was used before
        const currentSentenceCount = window.sentenceCount || 20;
        sentences = shuffle(filteredSentences).slice(0, currentSentenceCount);
        
        // Start the game at the beginning
        charImg.src = 'catstill.png';
        load();
      })
      .catch(error => {
        console.error('Error reloading data for restart:', error);
        // If there's an error, fall back to the topic selection screen
        const app = document.getElementById('app');
        const topicSelection = document.getElementById('topicSelection');
        
        if (app && topicSelection) {
          app.style.display = 'none';
          topicSelection.style.display = 'block';
        }
      });
  };
  
  toggleBtn.onclick = () => {
    soundEnabled = !soundEnabled;
    toggleBtn.textContent = soundEnabled ? '🎵 Sound: On' : '🔇 Sound: Off';
  };
  
  hintBtn.onclick = () => {
    if (!hintUsed && !hintBtn.disabled) {
      // Use the new animation function instead of direct text assignment
      animateSpeechBubble(speechBubble, sentences[idx].hint);
      
      // Use playRandomCatSound instead of hintSound
      if (soundEnabled) playRandomCatSound();
      
      hintUsed = true;
      hintBtn.disabled = true;
      hintBtn.textContent = 'Hint Used 🐾';

      // Animate the paw tap
      const paw = document.getElementById('pawTap');
      if (paw) {
        paw.style.animation = 'none';
        paw.offsetHeight; // triggers reflow to restart animation
        paw.style.animation = 'tapBounce 1s ease-out';
      }
    }
  };

  form.addEventListener('submit', e => {
    e.preventDefault();
    const userAns = input.value.trim().toLowerCase();
    const correctList = sentences[idx].answers.map(a => a.trim().toLowerCase()).filter(a => a);
    const isCorrect = correctList.includes(userAns);

    if (isCorrect) {
      handleCorrectAnswer();
    } else {
      attempts++;
      consecutiveCorrect = 0; // Reset consecutive correct counter on wrong answer
      
      if (attempts === 1) {
        // First mistake - only show "try again" message
        if (soundEnabled) {
          // Make sure the sound has reset before playing
          incorrectSound.pause();
          incorrectSound.currentTime = 0;
          incorrectSound.play();
        }
        
        // Set the cat image to catincorrect.png
        charImg.src = 'catincorrect.png';
        
        // Clear the input field to let the user try again
        input.value = '';
        
        // Enable the input field and submit button to allow a second attempt
        input.disabled = false;
        submitBtn.disabled = false;
        
        // Focus back on the input field for better UX
        input.focus();
        
        // Show message bubble with no explanation yet
        speechBubble.textContent = "Oops, try again!";
        speechBubble.style.display = 'block';
        speechBubble.classList.add('show');
        
        // Hide thought bubble in case it was showing
        thoughtBubble.style.display = 'none';
        thoughtBubble.classList.remove('show');
      } else {
        // Second mistake - now show the correct answer and explanation
        if (soundEnabled) {
          // Make sure the sound has reset before playing
          wrongSound.pause();
          wrongSound.currentTime = 0;
          wrongSound.play();
        }
        
        // Change cat image to catdefeat.png
        charImg.src = 'catdefeat.png';
        incorrectCount++;
        updateFooter();

        // Disable input
        input.disabled = submitBtn.disabled = true;
        
        // Show the correct answer
        let correctWord = sentences[idx].answers[0];
        if (sentences[idx].sentence.trim().startsWith("___")) {
          correctWord = correctWord.charAt(0).toUpperCase() + correctWord.slice(1);
        }
        sentDiv.innerHTML = sentences[idx].sentence.replace("___", `<span style="color:#FFA500; font-weight:bold;">${correctWord}</span>`);

        // Only show the explanation on the second wrong attempt
        thoughtBubble.textContent = sentences[idx].explanation; // Use explanation from YAML
        thoughtBubble.style.display = 'block';
        thoughtBubble.classList.add('show');
        
        // Show the continue button
        continueBtn.style.display = 'inline-block';
        hintBtn.disabled = true;
      }
    }
  });

  document.addEventListener('keydown', e => {
    if(e.key === 'Enter'){
      e.preventDefault();
      if(!submitBtn.disabled) form.requestSubmit();
      else if(continueBtn.style.display !== 'none') continueBtn.click();
    }
  });

  document.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('touchstart', () => btn.style.transform = 'scale(0.95)');
    btn.addEventListener('touchend', () => btn.style.transform = 'scale(1)');
  });

  // Cat blinking animation
  setInterval(() => {
    if(charImg.src.includes('catstill.png')){
      charImg.src = 'catblink.png';
      setTimeout(() => charImg.src = 'catstill.png', 200);
    }
  }, 5000);

  // Function to play a random cat sound
  function playRandomCatSound() {
    // Use only the catr*.wav and catmeow2.wav files, removed meow.mp3
    const catSounds = ['catr2.wav', 'catr3.wav', 'catr4.wav', 'catr5.wav', 'catr6.wav', 'catmeow2.wav'];
    const randomSound = catSounds[Math.floor(Math.random() * catSounds.length)];
    const audio = new Audio(randomSound);
    audio.volume = 0.18; // Increased by 20% from 0.15 to 0.18
    return audio.play();
  }

  // Add click event listener to the cat image for meow and animation only (no hint)
  charImg.addEventListener('click', () => {
    // Only respond if the cat is in waiting state to avoid interrupting other animations
    if(charImg.src.includes('catstill.png') || charImg.src.includes('catblink.png')) {
      // Change the cat image to speaking animation
      animateCatTalking(charImg);

      // Play a random cat sound if sound is enabled
      if (soundEnabled) {
        // Use the existing playRandomCatSound function to play a random cat sound
        playRandomCatSound()
          .then(() => {
            // After the sound finishes (or a short delay), revert to waiting image
            setTimeout(() => {
              if (!charImg.src.includes('cathappy.png') && 
                  !charImg.src.includes('type2.png') && 
                  !charImg.src.includes('type3.png') && 
                  !charImg.src.includes('type4.png') && 
                  !charImg.src.includes('catincorrect.png') && 
                  !charImg.src.includes('catdefeat.png')) {
                charImg.src = 'catstill.png';
              }
            }, 700); // Match to sound duration
          })
          .catch(error => {
            console.error('Error playing sound:', error);
            // Still revert animation after a delay if sound fails
            setTimeout(() => {
              if (!charImg.src.includes('cathappy.png') && 
                  !charImg.src.includes('type2.png') && 
                  !charImg.src.includes('type3.png') && 
                  !charImg.src.includes('type4.png') && 
                  !charImg.src.includes('catincorrect.png') && 
                  !charImg.src.includes('catdefeat.png')) {
                charImg.src = 'catstill.png';
              }
            }, 700);
          });
      } else {
        // If sound is disabled, just animate for a moment
        setTimeout(() => {
          if (!charImg.src.includes('cathappy.png') && 
              !charImg.src.includes('type2.png') && 
              !charImg.src.includes('type3.png') && 
              !charImg.src.includes('type4.png') && 
              !charImg.src.includes('catincorrect.png') && 
              !charImg.src.includes('catdefeat.png')) {
            charImg.src = 'catstill.png';
          }
        }, 700);
      }
    }
  });
  
  // Start the game
  load();
}

function handleCorrectAnswer() {
  const userAns = input.value.trim().toLowerCase();
  const color = attempts > 0 ? '#FFA500' : '#2ecc71';
  let displayedAnswer = userAns;
  if (sentences[idx].sentence.trim().startsWith("___")) {
    displayedAnswer = userAns.charAt(0).toUpperCase() + userAns.slice(1);
  }
  sentDiv.innerHTML = sentences[idx].sentence.replace("___", `<span style="color:${color}; font-weight:bold;">${displayedAnswer}</span>`);

  correctCount++;
  consecutiveCorrect++; // Increment consecutive correct counter
  updateFooter(); // Update the footer display

  // Check if user got three in a row
  if (consecutiveCorrect === 3) {
    const msg = "Three in a row! 🔥";
    animateSpeechBubble(speechBubble, msg);
    if (typeof confetti === 'function') {
      confetti({ 
        particleCount: 150, 
        spread: 70, 
        origin: { y: 0.6 },
        colors: ['#FF5722', '#FFA000', '#FFD600'] // Fire colors
      });
    }
  } else {
    const msg = positiveMessages[Math.floor(Math.random() * positiveMessages.length)];
    // Use the animation function for the message
    animateSpeechBubble(speechBubble, msg + " 🎉");
  }
  
  if (soundEnabled) {
    // Make sure the sound has reset before playing
    correctSound.pause();
    correctSound.currentTime = 0;
    correctSound.play().catch(e => console.log("Couldn't play correct sound: ", e));
  }
  
  if (consecutiveCorrect !== 3 && typeof confetti === 'function') {
    confetti({ particleCount:100, spread:60, origin:{ y:0.6 }});
  }
  charImg.src = 'cathappy.png';
  input.disabled = submitBtn.disabled = true;
  setTimeout(nextQuestion, 2000); // Increased delay from 1500ms to 2000ms
}

function handleGameOver() {
  // Get final scores
  const correctCount = parseInt(document.getElementById('correctCount').textContent);
  const incorrectCount = parseInt(document.getElementById('incorrectCount').textContent);
  
  // Play harp sound if player has more correct than incorrect answers
  if (correctCount > incorrectCount) {
    harpSound.currentTime = 0;
    harpSound.play().catch(e => console.log("Couldn't play harp sound: ", e));
    
    // You could also add some visual celebration here
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  }
  
  // Rest of your game over handling code...
}
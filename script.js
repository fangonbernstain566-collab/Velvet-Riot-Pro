// ─────────────────────────────────────────────
// SAVE EARNINGS (GLOBAL)
// ─────────────────────────────────────────────
window.saveEarnings = function(amount) {
  gameState.gold += amount;
  localStorage.setItem('velvetRiotGold', gameState.gold);

  const display = document.getElementById('goldDisplay');
  if (display) display.textContent = gameState.gold;
};

// ─────────────────────────────────────────────
// GAME STATE
// ─────────────────────────────────────────────
const gameState = {
  gold: 0,
  inventory: {},
  sfxEnabled: true,
  musicEnabled: true,
  volume: 0.8
};

// ─────────────────────────────────────────────
// SFX TOGGLE
// ─────────────────────────────────────────────
function toggleSfx(element) {
  element.classList.toggle('on');
  gameState.sfxEnabled = element.classList.contains('on');
  console.log("SFX Enabled:", gameState.sfxEnabled);
}

// ─────────────────────────────────────────────
// SHOP ITEMS DATABASE
// ─────────────────────────────────────────────
const shopItems = [
  { id: 'sword', name: 'Sword', price: 50, emoji: '⚔️' },
  { id: 'shield', name: 'Shield', price: 40, emoji: '🛡️' },
  { id: 'potion', name: 'Potion', price: 20, emoji: '🧪' },
  { id: 'armor', name: 'Armor', price: 75, emoji: '🛠️' },
  { id: 'boots', name: 'Boots', price: 30, emoji: '👢' },
  { id: 'ring', name: 'Ring', price: 60, emoji: '💍' }
];

// ─────────────────────────────────────────────
// SAVE EARNINGS (LOCAL FUNCTION)
// ─────────────────────────────────────────────
function saveEarnings(amount) {
  gameState.gold += amount;
  updateGoldDisplay();
  localStorage.setItem('velvetRiotGold', gameState.gold);
}

// ─────────────────────────────────────────────
// PAGE LOAD
// ─────────────────────────────────────────────
window.onload = () => {

  // LOAD GOLD
  const savedGold = localStorage.getItem('velvetRiotGold');
  if (savedGold) {
    gameState.gold = parseInt(savedGold);
    updateGoldDisplay();
  }

  // LOADING SCREEN
  let progress = 0;
  const fill = document.getElementById("loadingFill");
  const text = document.getElementById("loadingText");

  const interval = setInterval(() => {
    progress += 1;

    fill.style.width = progress + "%";
    text.innerText = "Loading... " + progress + "%";

    if (progress >= 100) {
      clearInterval(interval);

      setTimeout(() => {
        document.getElementById("loadingScreen").style.display = "none";
        document.getElementById("mainMenu").style.display = "flex";
      }, 300);
    }
  }, 20);

  // LOAD VOLUME
  const savedVolume = localStorage.getItem('velvetRiotVolume');
  if (savedVolume !== null) {
    gameState.volume = parseFloat(savedVolume);
  }

  // VOLUME SLIDER
  const slider = document.getElementById('volumeSlider');

  if (slider) {
    slider.value = gameState.volume * 100;

    slider.addEventListener('input', function () {
      gameState.volume = Math.pow(this.value / 100, 0.6);
      localStorage.setItem('velvetRiotVolume', gameState.volume);

      if (window.game && game.scene.scenes[0]?.bgmusic) {
        game.scene.scenes[0].bgmusic.setVolume(gameState.volume);
      }
    });
  }
};

// ─────────────────────────────────────────────
// MENU CONTROLS
// ─────────────────────────────────────────────
function showPlay() {
  document.getElementById('mainMenu').style.display = 'none';
  document.getElementById('game-container').style.display = 'block';
  startGame();
}

function showShop() {
  document.getElementById('mainMenu').style.display = 'none';
  document.getElementById('shopScreen').style.display = 'flex';
  renderShop();
}

function showSettings() {
  document.getElementById('mainMenu').style.display = 'none';
  document.getElementById('settingsScreen').style.display = 'flex';
}

function backToMenu() {
  document.getElementById('shopScreen').style.display = 'none';
  document.getElementById('settingsScreen').style.display = 'none';
  document.getElementById('mainMenu').style.display = 'flex';
}

// ─────────────────────────────────────────────
// SHOP SYSTEM
// ─────────────────────────────────────────────
function renderShop() {
  const shopGrid = document.getElementById('shopGrid');
  shopGrid.innerHTML = '';

  shopItems.forEach(item => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'shop-item';

    const canAfford = gameState.gold >= item.price;

    itemDiv.innerHTML = `
      <div style="font-size: 36px; margin-bottom: 5px;">${item.emoji}</div>
      <div class="shop-item-name">${item.name}</div>
      <div class="shop-item-price">${item.price} 💰</div>
      <button class="buy-btn"
        onclick="buyItem('${item.id}', ${item.price})"
        ${!canAfford ? 'disabled' : ''}>
        BUY
      </button>
    `;

    shopGrid.appendChild(itemDiv);
  });
}

// ─────────────────────────────────────────────
// BUY SYSTEM
// ─────────────────────────────────────────────
function buyItem(itemId, price) {
  gameState.pendingPurchase = { itemId, price };
  document.getElementById('confirmModal').style.display = 'flex';
}

function confirmBuy() {
  if (gameState.pendingPurchase) {
    const { itemId, price } = gameState.pendingPurchase;

    if (gameState.gold >= price) {
      gameState.gold -= price;
      gameState.inventory[itemId] =
        (gameState.inventory[itemId] || 0) + 1;

      updateGoldDisplay();
      renderShop();
    }
  }

  cancelBuy();
}

function cancelBuy() {
  gameState.pendingPurchase = null;
  document.getElementById('confirmModal').style.display = 'none';
}

// ─────────────────────────────────────────────
// UI UPDATE
// ─────────────────────────────────────────────
function updateGoldDisplay() {
  document.getElementById('goldDisplay').textContent = gameState.gold;
}

// ─────────────────────────────────────────────
// MUSIC TOGGLE
// ─────────────────────────────────────────────
function toggleMusic(element) {
  element.classList.toggle('on');
  gameState.musicEnabled = element.classList.contains('on');
  console.log("Music Enabled:", gameState.musicEnabled);
}
// Game state
const gameState = {
  gold: 2000,
  inventory: {}
};

// Shop items database
const shopItems = [
  { id: 'sword', name: 'Sword', price: 50, emoji: '⚔️' },
  { id: 'shield', name: 'Shield', price: 40, emoji: '🛡️' },
  { id: 'potion', name: 'Potion', price: 20, emoji: '🧪' },
  { id: 'armor', name: 'Armor', price: 75, emoji: '🛠️' },
  { id: 'boots', name: 'Boots', price: 30, emoji: '👢' },
  { id: 'ring', name: 'Ring', price: 60, emoji: '💍' }
];

function showPlay() {
  alert('Play!');
}

function showShop() {
  document.getElementById('mainMenu').style.display = 'none';
  document.getElementById('shopScreen').style.display = 'flex';
  renderShop();
}

function showSettings() {
  alert('Settings!');
}

function backToMenu() {
  document.getElementById('shopScreen').style.display = 'none';
  document.getElementById('mainMenu').style.display = 'flex';
}

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

function buyItem(itemId, price) {
  gameState.pendingPurchase = { itemId, price };
  document.getElementById('confirmModal').style.display = 'flex';
}

function confirmBuy() {
  if (gameState.pendingPurchase) {
    const { itemId, price } = gameState.pendingPurchase;
    if (gameState.gold >= price) {
      gameState.gold -= price;
      gameState.inventory[itemId] = (gameState.inventory[itemId] || 0) + 1;
      updateGoldDisplay();
      renderShop();
      console.log(`Bought ${itemId}!`, gameState);
    }
  }
  cancelBuy();
}

function cancelBuy() {
  gameState.pendingPurchase = null;
  document.getElementById('confirmModal').style.display = 'none';
}

function updateGoldDisplay() {
  document.getElementById('goldDisplay').textContent = gameState.gold;
}

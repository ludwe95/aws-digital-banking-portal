const list = document.querySelector('#transactions');
const statusText = document.querySelector('#status');
const apiUrl = window.APP_CONFIG.apiUrl;
 
async function loadTransactions() {
  statusText.textContent = 'Loading...';
  try {
    const response = await fetch(`${apiUrl}/transactions`);
    if (!response.ok) throw new Error('Request failed');
    const data = await response.json();
    list.innerHTML = '';
    data.transactions.forEach(item => {
      const row = document.createElement('li');
      row.textContent = `${item.type}: R${item.amount} - ${item.description || 'Demo'}`;
      list.appendChild(row);
    });
    statusText.textContent = `${data.transactions.length} demo transaction(s) loaded.`;
  } catch (error) {
    statusText.textContent = 'Could not load transactions. Check the API URL and CORS settings.';
  }
}
 
async function addDeposit() {
  statusText.textContent = 'Adding demo deposit...';
  try {
    const response = await fetch(`${apiUrl}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'Deposit', amount: 100, description: 'Demo deposit' })
    });
    if (!response.ok) throw new Error('Request failed');
    await loadTransactions();
  } catch (error) {
    statusText.textContent = 'Could not add the demo deposit.';
  }
}
 
document.querySelector('#load').addEventListener('click', loadTransactions);
document.querySelector('#deposit').addEventListener('click', addDeposit);


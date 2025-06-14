document.addEventListener('DOMContentLoaded', () => {
  // Cache DOM elements
  const itemsList = document.getElementById('itemsList');
  const loadingItems = document.getElementById('loadingItems');
  const errorMessage = document.getElementById('errorMessage');
  const addItemForm = document.getElementById('addItemForm');
  const editItemForm = document.getElementById('editItemForm');
  const submitNewItem = document.getElementById('submitNewItem');
  const updateItem = document.getElementById('updateItem');
  const cancelEdit = document.getElementById('cancelEdit');

  // Fetch all items
  async function fetchItems() {
    itemsList.innerHTML = '';
    loadingItems.classList.remove('hidden');
    errorMessage.classList.add('hidden');

    try {
      const response = await fetch('/api/items');
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const items = await response.json();
      
      loadingItems.classList.add('hidden');
      
      if (items.length === 0) {
        itemsList.innerHTML = '<p>No items found. Add your first item above!</p>';
        return;
      }
      
      displayItems(items);
    } catch (error) {
      loadingItems.classList.add('hidden');
      errorMessage.textContent = `Error loading items: ${error.message}`;
      errorMessage.classList.remove('hidden');
      console.error('Error fetching items:', error);
    }
  }

  // Display items in the UI
  function displayItems(items) {
    itemsList.innerHTML = '';
    
    items.forEach(item => {
      const li = document.createElement('li');
      li.className = 'saved-item';
      li.dataset.itemId = item.id;
      
      li.innerHTML = `
        <div class="item-content">
          <strong>${escapeHtml(item.name)}</strong> - ${escapeHtml(item.description)}
        </div>
        <div class="item-actions">
          <button class="btn edit" data-id="${item.id}">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn delete" data-id="${item.id}">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `;
      
      itemsList.appendChild(li);
    });
    
    // Add event listeners to action buttons
    document.querySelectorAll('.btn.edit').forEach(button => {
      button.addEventListener('click', () => editItem(button.dataset.id));
    });
    
    document.querySelectorAll('.btn.delete').forEach(button => {
      button.addEventListener('click', () => deleteItem(button.dataset.id));
    });
  }

  // Create new item
  async function createItem(name, description) {
    try {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, description })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server returned ${response.status}`);
      }
      
      // Clear form fields
      document.getElementById('itemName').value = '';
      document.getElementById('itemDescription').value = '';
      
      // Refresh items list
      fetchItems();
    } catch (error) {
      errorMessage.textContent = `Error creating item: ${error.message}`;
      errorMessage.classList.remove('hidden');
      console.error('Error creating item:', error);
    }
  }

  // Set up edit form for an item
  async function editItem(id) {
    try {
      const response = await fetch(`/api/items/${id}`);
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      
      const item = await response.json();
      
      // Populate edit form
      document.getElementById('editItemId').value = item.id;
      document.getElementById('editItemName').value = item.name;
      document.getElementById('editItemDescription').value = item.description;
      
      // Show edit form, hide add form
      addItemForm.classList.add('hidden');
      editItemForm.classList.remove('hidden');
    } catch (error) {
      errorMessage.textContent = `Error loading item: ${error.message}`;
      errorMessage.classList.remove('hidden');
      console.error('Error loading item for edit:', error);
    }
  }

  // Update an item
  async function updateItemData(id, name, description) {
    try {
      const response = await fetch(`/api/items/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, description })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server returned ${response.status}`);
      }
      
      // Hide edit form, show add form
      editItemForm.classList.add('hidden');
      addItemForm.classList.remove('hidden');
      
      // Refresh items list
      fetchItems();
    } catch (error) {
      errorMessage.textContent = `Error updating item: ${error.message}`;
      errorMessage.classList.remove('hidden');
      console.error('Error updating item:', error);
    }
  }

  // Delete an item
  async function deleteItem(id) {
    if (!confirm('Are you sure you want to delete this item?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/items/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      
      // Refresh items list
      fetchItems();
    } catch (error) {
      errorMessage.textContent = `Error deleting item: ${error.message}`;
      errorMessage.classList.remove('hidden');
      console.error('Error deleting item:', error);
    }
  }

  // Helper function to escape HTML to prevent XSS
  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Add event listeners
  submitNewItem.addEventListener('click', () => {
    const name = document.getElementById('itemName').value.trim();
    const description = document.getElementById('itemDescription').value.trim();
    
    if (!name || !description) {
      errorMessage.textContent = 'Please enter both name and description';
      errorMessage.classList.remove('hidden');
      return;
    }
    
    errorMessage.classList.add('hidden');
    createItem(name, description);
  });

  updateItem.addEventListener('click', () => {
    const id = document.getElementById('editItemId').value;
    const name = document.getElementById('editItemName').value.trim();
    const description = document.getElementById('editItemDescription').value.trim();
    
    if (!name || !description) {
      errorMessage.textContent = 'Please enter both name and description';
      errorMessage.classList.remove('hidden');
      return;
    }
    
    errorMessage.classList.add('hidden');
    updateItemData(id, name, description);
  });

  cancelEdit.addEventListener('click', () => {
    // Hide edit form, show add form
    editItemForm.classList.add('hidden');
    addItemForm.classList.remove('hidden');
    errorMessage.classList.add('hidden');
  });

  // Initial load
  fetchItems();
});
// renderer.js
console.log('renderer.js loaded successfully');

// Load Flatpickr CSS using fs
const fs = require('fs');
const path = require('path');
try {
  const flatpickrCssPath = path.join(__dirname, '../node_modules/flatpickr/dist/flatpickr.min.css');
  const flatpickrCss = fs.readFileSync(flatpickrCssPath, 'utf8');
  const style = document.createElement('style');
  style.textContent = flatpickrCss;
  document.head.appendChild(style);
  console.log('Flatpickr CSS loaded successfully');
} catch (error) {
  console.error('Error loading Flatpickr CSS:', error);
}

const { ipcRenderer } = require('electron');
const { createClient } = require('@supabase/supabase-js');
const config = require('./utils/config');

// Initialize Supabase client for authentication with no session persistence
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Supabase URL or Anon Key not found in environment variables');
  throw new Error('Supabase URL or Anon Key not found in environment variables');
}
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false, // Disable session persistence
  },
});

// Import form modules with error handling
let forms = {};
try {
  forms['transfer-in-out'] = require('./forms/transferInOut');
  console.log('transferInOut loaded');
  forms['staging-request'] = require('./forms/stagingRequest');
  console.log('stagingRequest loaded');
  forms['transaction-updates'] = require('./forms/transactionUpdates');
  console.log('transactionUpdates loaded');
  forms['inventory-display'] = require('./forms/inventoryDisplay');
  console.log('inventoryDisplay loaded');
  forms['staging-updates'] = require('./forms/stagingUpdates');
  console.log('stagingUpdates loaded');
  forms['product-master'] = require('./forms/productMaster');
  console.log('productMaster loaded');
  forms['reports'] = require('./forms/reports');
  console.log('reports loaded');
} catch (error) {
  console.error('Error loading form modules:', error);
}

let activeForm = null;
let isSubmitting = false;
let currentUser = null;
let lastAuthState = null;

// Map sections to their corresponding SQLite tables
const sectionToTableMap = {
  'transfer-in-out': 'transfers',
  'staging-request': 'staging_requests',
  'transaction-updates': 'transaction_updates',
  'inventory_display': 'mass',
  'staging-updates': 'staging_updates',
  'product-master': 'product_master',
  'reports': 'reports'
};

// Handle authentication state
async function initializeAuth() {
  // Always sign out any existing session on app start
  await supabase.auth.signOut();
  currentUser = null;
  console.log('Cleared any existing session on app start');
  showLoginScreen();

  supabase.auth.onAuthStateChange((event, session) => {
    // Prevent duplicate handling of the same auth state
    if (lastAuthState === event && session?.user?.email === currentUser?.email) {
      console.log('Duplicate auth state change event, ignoring:', event);
      return;
    }
    lastAuthState = event;

    if (event === 'SIGNED_IN') {
      currentUser = session.user;
      console.log('User signed in:', currentUser.email);
      
      // Check if there's a nickname in metadata
      let nickname = currentUser.email;
      if (currentUser.user_metadata && currentUser.user_metadata.nickname) {
        nickname = currentUser.user_metadata.nickname;
        // Also update localStorage for faster access next time
        localStorage.setItem(`nickname_${currentUser.email}`, nickname);
      } else {
        // Check if there's a nickname in localStorage
        const savedNickname = localStorage.getItem(`nickname_${currentUser.email}`);
        if (savedNickname) {
          nickname = savedNickname;
          // Try to update user metadata for persistence across devices
          supabase.auth.updateUser({
            data: { nickname: nickname }
          }).catch(err => console.error('Error updating user metadata:', err));
        }
      }
      
      updateHeaderUser(currentUser.email); // The updateHeaderUser function will now use the nickname
      showDashboard();
    } else if (event === 'SIGNED_OUT') {
      currentUser = null;
      console.log('User signed out');
      updateHeaderUser(null);
      showLoginScreen();
    }
  });
}

function updateHeaderUser(email) {
  const userDisplay = document.querySelector('header .flex.items-center:last-child');
  if (email) {
    // Get nickname from localStorage if it exists
    const nickname = localStorage.getItem(`nickname_${email}`) || email;
    
    userDisplay.innerHTML = `
      <div class="flex items-center">
        <div class="text-gray-600 mr-4">Welcome, <span id="user-display-name" class="cursor-pointer hover:underline" title="Click to set nickname">${nickname}</span></div>
        <button id="logout-btn" class="bg-red-500 text-white py-1 px-3 rounded-lg hover:bg-red-600">Logout</button>
      </div>
    `;
    
    // Add click handler for nickname setting
    const displayNameEl = document.getElementById('user-display-name');
    displayNameEl.addEventListener('click', () => {
      showNicknameModal(email, nickname);
    });
    
    const logoutBtn = document.getElementById('logout-btn');
    // Remove existing listeners to prevent duplicates
    const logoutBtnClone = logoutBtn.cloneNode(true);
    logoutBtn.parentNode.replaceChild(logoutBtnClone, logoutBtn);
    logoutBtnClone.addEventListener('click', async () => {
      await supabase.auth.signOut();
    });
  } else {
    userDisplay.innerHTML = `<div class="text-gray-600">Welcome, Guest</div>`;
  }
}

// Add the nickname modal function
function showNicknameModal(email, currentNickname) {
  // Create modal overlay
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 fade-in-scale';
  
  // Create modal content
  modalOverlay.innerHTML = `
    <div class="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
      <h3 class="text-xl font-bold text-gray-800 mb-4">Set Your Nickname</h3>
      <div class="mb-4">
        <label for="nickname-input" class="block text-sm font-medium text-gray-700 mb-1">Nickname</label>
        <input type="text" id="nickname-input" class="border-gray-300 rounded-lg p-2 w-full" 
          value="${currentNickname === email ? '' : currentNickname}" placeholder="Enter your nickname">
      </div>
      <div class="text-sm text-gray-500 mb-4">Your email: ${email}</div>
      <div class="flex justify-end space-x-2">
        <button id="cancel-nickname" class="bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400">Cancel</button>
        <button id="save-nickname" class="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600">Save</button>
      </div>
    </div>
  `;
  
  // Add to body
  document.body.appendChild(modalOverlay);
  
  // Setup event listeners
  document.getElementById('cancel-nickname').addEventListener('click', () => {
    document.body.removeChild(modalOverlay);
  });
  
  document.getElementById('save-nickname').addEventListener('click', async () => {
    const nicknameInput = document.getElementById('nickname-input');
    const nickname = nicknameInput.value.trim() || email;
    
    // Save nickname to localStorage
    localStorage.setItem(`nickname_${email}`, nickname);
    
    // Update display
    document.getElementById('user-display-name').textContent = nickname;
    
    // Try to save to Supabase user metadata (for persistence across devices)
    try {
      const { error } = await supabase.auth.updateUser({
        data: { nickname: nickname }
      });
      
      if (error) {
        console.error('Error saving nickname to user metadata:', error);
      }
    } catch (err) {
      console.error('Error updating user metadata:', err);
    }
    
    // Close modal
    document.body.removeChild(modalOverlay);
  });
  
  // Focus the input
  document.getElementById('nickname-input').focus();
}

function showLoginScreen() {
  const dashboard = document.getElementById('dashboard');
  const content = document.getElementById('content');
  const loginContainer = document.getElementById('login-container');
  const formContainer = document.getElementById('form-container');

  dashboard.classList.add('hidden');
  content.classList.remove('hidden');
  loginContainer.classList.remove('hidden');
  formContainer.classList.add('hidden');

  // Ensure event listeners are added only once
  const loginBtn = document.getElementById('login-btn');
  const signupBtn = document.getElementById('signup-btn');

  // Remove existing listeners to prevent duplicates
  const loginBtnClone = loginBtn.cloneNode(true);
  const signupBtnClone = signupBtn.cloneNode(true);
  loginBtn.parentNode.replaceChild(loginBtnClone, loginBtn);
  signupBtn.parentNode.replaceChild(signupBtnClone, signupBtn);

  loginBtnClone.addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const message = document.getElementById('auth-message');

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      message.textContent = `Login failed: ${error.message}`;
      message.classList.add('bg-red-100', 'text-red-700', 'p-2', 'rounded-lg', 'shake');
    }
  });

  signupBtnClone.addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const message = document.getElementById('auth-message');

    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      message.textContent = `Sign up failed: ${error.message}`;
      message.classList.add('bg-red-100', 'text-red-700', 'p-2', 'rounded-lg', 'shake');
    } else {
      message.textContent = 'Sign up successful! Please check your email to confirm.';
      message.classList.add('bg-green-100', 'text-green-700', 'p-2', 'rounded-lg', 'fade-in-scale');
    }
  });
}

function showDashboard() {
  const dashboard = document.getElementById('dashboard');
  const content = document.getElementById('content');
  const loginContainer = document.getElementById('login-container');
  const formContainer = document.getElementById('form-container');

  dashboard.classList.remove('hidden');
  content.classList.add('hidden');
  loginContainer.classList.add('hidden');
  formContainer.classList.add('hidden');
}

// Expose a function to sign out the user, called from main.js
window.signOutUser = async function () {
  await supabase.auth.signOut();
  console.log('User signed out on app close');
};

// Handle welcome banner and initialize the app
document.addEventListener('DOMContentLoaded', () => {
  const welcomeBanner = document.getElementById('welcome-banner');
  const welcomeDismiss = document.getElementById('welcome-dismiss');

  // Check if the welcome banner has been dismissed
  if (!localStorage.getItem('welcomeDismissed')) {
    welcomeBanner.classList.remove('hidden');
  }

  welcomeDismiss.addEventListener('click', () => {
    welcomeBanner.classList.add('hidden');
    localStorage.setItem('welcomeDismissed', 'true');
  });

  initializeAuth();
  attachEventListeners();
  addSyncButtonToDashboard();
});

function addSyncButtonToDashboard() {
  const syncButtonContainer = document.getElementById('sync-button-container');
  if (!syncButtonContainer) {
    console.error('Sync button container element not found');
    return;
  }

  console.log('Appending Sync Now button to sync-button-container');

  const syncButton = document.createElement('button');
  syncButton.id = 'sync-now-btn';
  syncButton.className = 'group bg-yellow-500 text-white py-3 px-6 rounded-lg shadow-md hover:bg-yellow-600 hover:shadow-sm hover:scale-105 active:scale-95 transition duration-200 focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500';
  syncButton.innerHTML = `
    <svg class="inline-block w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
    </svg>
    Sync Now
    <span class="tooltip">Sync data with Supabase</span>
  `;

  syncButton.addEventListener('click', async () => {
    if (!currentUser) {
      showLoginScreen();
      return;
    }

    syncButton.disabled = true;
    syncButton.innerHTML = `
      <svg class="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Syncing...
    `;
    const result = await ipcRenderer.invoke('sync-now');
    syncButton.disabled = false;
    syncButton.innerHTML = `
      <svg class="inline-block w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
      </svg>
      Sync Now
      <span class="tooltip">Sync data with Supabase</span>
    `;
    showSyncStatus(result);
  });

  syncButtonContainer.appendChild(syncButton);
  console.log('Sync Now button appended successfully');
}

function showSyncStatus(status) {
  const toast = document.createElement('div');
  toast.className = 'fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg z-50 fade-in-scale';
  if (status.success) {
    toast.innerHTML = `
      <div class="flex items-center">
        <svg class="w-6 h-6 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        <div>
          <h3 class="font-bold">Sync Completed</h3>
          <p class="text-sm">Uploaded: ${status.uploaded}, Downloaded: ${status.downloaded}</p>
        </div>
      </div>
    `;
  } else {
    toast.innerHTML = `
      <div class="flex items-center">
        <svg class="w-6 h-6 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        </svg>
        <div>
          <h3 class="font-bold">Sync Failed</h3>
          <p class="text-sm">${status.message}</p>
        </div>
      </div>
    `;
  }
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => document.body.removeChild(toast), 500);
  }, 5000);
}

function navigate(section) {
  if (isSubmitting) {
    console.log('Submission in progress, ignoring navigation to:', section);
    return;
  }

  if (!currentUser) {
    showLoginScreen();
    return;
  }

  console.log(`Navigating to section: ${section}`);
  const form = forms[section];
  if (!form) {
    console.log(`Form not found for section: ${section}`);
    document.getElementById('message').textContent = 'Section not implemented.';
    return;
  }

  // Highlight the active button
  document.querySelectorAll('#dashboard button').forEach(btn => btn.classList.remove('active'));
  const activeButton = document.querySelector(`#dashboard button[data-section="${section}"]`);
  if (activeButton) {
    activeButton.classList.add('active');
  }

  activeForm = form;

  // Show the form container and hide the login container
  const dashboard = document.getElementById('dashboard');
  const content = document.getElementById('content');
  const loginContainer = document.getElementById('login-container');
  const formContainer = document.getElementById('form-container');

  dashboard.classList.add('hidden');
  content.classList.remove('hidden');
  loginContainer.classList.add('hidden');
  formContainer.classList.remove('hidden');

  // Update the form content
  const contentTitle = document.getElementById('content-title');
  const message = document.getElementById('message');
  if (contentTitle) {
    contentTitle.textContent = form.title;
  } else {
    console.error('content-title element not found');
  }
  if (message) {
    message.textContent = '';
  } else {
    console.error('message element not found');
  }

  console.log(`Rendering form: ${form.title}`);
  try {
    const contentBody = document.getElementById('content-body');
    if (contentBody) {
      form.render(contentBody, config);
    } else {
      throw new Error('content-body element not found');
    }
  } catch (error) {
    console.error(`Error rendering form ${section}:`, error);
    if (message) {
      message.textContent = 'Error rendering form. Please try again.';
      message.classList.add('bg-red-100', 'text-red-700', 'p-2', 'rounded-lg', 'shake');
    }
  }
}

function submitForm() {
  console.log('Submit button clicked');
  if (isSubmitting) {
    console.log('Already submitting, ignoring additional submit');
    return;
  }
  if (!activeForm) {
    const message = document.getElementById('message');
    if (message) {
      message.textContent = 'No active form to submit.';
      message.classList.add('bg-red-100', 'text-red-700', 'p-2', 'rounded-lg', 'shake');
    }
    return;
  }
  if (!currentUser) {
    showLoginScreen();
    return;
  }

  isSubmitting = true;
  const submitText = document.getElementById('submit-text');
  const submitSpinner = document.getElementById('submit-spinner');
  if (submitText) submitText.classList.add('hidden');
  if (submitSpinner) submitSpinner.classList.remove('hidden');

  try {
    const data = activeForm.getData();
    console.log('Form data:', data);
    if (!activeForm.validate(data.data)) {
      const message = document.getElementById('message');
      if (message) {
        message.textContent = 'Please fill all required fields with valid values.';
        message.classList.add('bg-red-100', 'text-red-700', 'p-2', 'rounded-lg', 'shake');
      }
      isSubmitting = false;
      if (submitText) submitText.classList.remove('hidden');
      if (submitSpinner) submitSpinner.classList.add('hidden');
      return;
    }

    const section = Object.keys(forms).find(key => forms[key] === activeForm);
    const table = sectionToTableMap[section];

    if (!table) {
      throw new Error(`No table mapped for section: ${section}`);
    }
    // Send data to main process and wait for response
    ipcRenderer.send('save-to-excel', { table, data: data.data });
  } catch (error) {
    console.error('Error in submitForm:', error);
    const message = document.getElementById('message');
    if (message) {
      message.textContent = 'Error submitting form: ' + error.message;
      message.classList.add('bg-red-100', 'text-red-700', 'p-2', 'rounded-lg', 'shake');
    }
    isSubmitting = false;
    if (submitText) submitText.classList.remove('hidden');
    if (submitSpinner) submitSpinner.classList.add('hidden');
  }
}

function clearForm() {
  console.log('Clear button clicked');
  if (!activeForm) return;

  try {
    const contentBody = document.getElementById('content-body');
    if (contentBody) {
      contentBody.querySelectorAll('input, select, textarea').forEach(input => {
        if (input.type === 'number') input.value = '';
        if (input.tagName === 'TEXTAREA') input.value = '';
        if (input.tagName === 'SELECT') input.value = '';
        if (input.id.includes('date')) activeForm.resetDate?.(input);
      });
    }
    const message = document.getElementById('message');
    if (message) {
      message.textContent = 'Form cleared.';
      message.classList.add('bg-yellow-100', 'text-yellow-700', 'p-2', 'rounded-lg', 'fade-in-scale');
    }
  } catch (error) {
    console.error('Error clearing form:', error);
    const message = document.getElementById('message');
    if (message) {
      message.textContent = 'Error clearing form: ' + error.message;
      message.classList.add('bg-red-100', 'text-red-700', 'p-2', 'rounded-lg', 'shake');
    }
  }
}

function backToDashboard() {
  console.log('Back to Dashboard clicked');
  document.querySelectorAll('#dashboard button').forEach(btn => btn.classList.remove('active'));
  activeForm = null;
  const content = document.getElementById('content');
  const dashboard = document.getElementById('dashboard');
  const message = document.getElementById('message');
  if (content) content.classList.add('hidden');
  if (dashboard) dashboard.classList.remove('hidden');
  if (message) message.textContent = '';
  isSubmitting = false;
}

// Attach event listeners with a fallback
function attachEventListeners() {
  console.log('Attaching event listeners');
  const buttons = document.querySelectorAll('#dashboard button');
  console.log(`Found ${buttons.length} buttons in #dashboard`);
  buttons.forEach((button, index) => {
    const section = button.getAttribute('data-section');
    console.log(`Button ${index + 1}: section=${section}`);
    if (section) {
      // Remove existing listeners to prevent duplicates
      const buttonClone = button.cloneNode(true);
      button.parentNode.replaceChild(buttonClone, button);
      buttonClone.addEventListener('click', () => {
        console.log(`Button clicked for section: ${section}`);
        navigate(section);
      });
    } else {
      console.log(`Button ${index + 1} has no data-section attribute`);
    }
  });

  const submitButton = document.querySelector('#form-container .btn-primary');
  const clearButton = document.querySelector('#form-container .btn-secondary');
  const backButton = document.querySelector('#form-container .btn-back');

  // Remove existing listeners to prevent duplicates
  if (submitButton) {
    const submitButtonClone = submitButton.cloneNode(true);
    submitButton.parentNode.replaceChild(submitButtonClone, submitButton);
    console.log('Submit button found, attaching listener');
    submitButtonClone.addEventListener('click', submitForm);
  }
  if (clearButton) {
    const clearButtonClone = clearButton.cloneNode(true);
    clearButton.parentNode.replaceChild(clearButtonClone, clearButton);
    console.log('Clear button found, attaching listener');
    clearButtonClone.addEventListener('click', clearForm);
  }
  if (backButton) {
    const backButtonClone = backButton.cloneNode(true);
    backButton.parentNode.replaceChild(backButtonClone, backButton);
    console.log('Back button found, attaching listener');
    backButtonClone.addEventListener('click', backToDashboard);
  }
}

// Fallback: Retry attaching listeners after a short delay
setTimeout(() => {
  if (document.querySelectorAll('#dashboard button').length === 0) {
    console.log('Retrying to attach event listeners after delay');
    attachEventListeners();
  }
}, 1000);

// IPC listeners
ipcRenderer.on('save-to-excel-reply', (event, message) => {
  try {
    console.log('Received save-to-excel-reply:', message);
    const messageElement = document.getElementById('message');
    const submitText = document.getElementById('submit-text');
    const submitSpinner = document.getElementById('submit-spinner');
    if (!messageElement) {
      throw new Error('Message element not found');
    }
    messageElement.textContent = message;
    if (message.includes('successfully')) {
      messageElement.classList.add('bg-green-100', 'text-green-700', 'p-2', 'rounded-lg', 'fade-in-scale');
      messageElement.innerHTML = `
        <svg class="inline-block w-5 h-5 mr-2 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        ${message}
      `;
      setTimeout(backToDashboard, 1000);
    } else {
      messageElement.classList.add('bg-red-100', 'text-red-700', 'p-2', 'rounded-lg', 'shake');
    }
    if (submitText) submitText.classList.remove('hidden');
    if (submitSpinner) submitSpinner.classList.add('hidden');
  } catch (error) {
    console.error('Error handling save-to-excel-reply:', error);
    console.log('Failed to update UI with message:', message);
  } finally {
    isSubmitting = false;
  }
});

ipcRenderer.on('test-excel-reply', (event, message) => {
  console.log('Received test-excel-reply:', message);
  const contentBody = document.getElementById('content-body');
  if (contentBody) {
    contentBody.innerHTML += `<p>${message}</p>`;
  }
});

ipcRenderer.on('sync-status', (event, status) => {
  showSyncStatus(status);
});
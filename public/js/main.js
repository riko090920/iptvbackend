// Login functionality
document.addEventListener('DOMContentLoaded', function() {
  // Handle login form submission
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      const errorElement = document.getElementById('errorMessage');
      
      try {
        const response = await fetch('/admin/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          window.location.href = data.redirect || '/admin/';
        } else {
          errorElement.textContent = data.error || 'Login failed';
        }
      } catch (error) {
        errorElement.textContent = 'Network error. Please try again.';
        console.error('Login error:', error);
      }
    });
  }
  
  // Dashboard functionality
  if (document.querySelector('.dashboard-container')) {
    // Load initial data
    loadDashboardData();
    
    // Handle navigation
    document.querySelectorAll('.sidebar a').forEach(link => {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        const target = this.getAttribute('href').substring(1);
        
        // Update active state
        document.querySelectorAll('.sidebar li').forEach(li => {
          li.classList.remove('active');
        });
        this.parentElement.classList.add('active');
        
        // Show target section
        document.querySelectorAll('.content-section').forEach(section => {
          section.style.display = 'none';
        });
        document.getElementById(target).style.display = 'block';
      });
    });
  }
});

async function loadDashboardData() {
  try {
    // Load customers
    const customersRes = await fetch('/admin/api/customers');
    const customersData = await customersRes.json();
    
    // Update stats
    document.getElementById('totalCustomers').textContent = 
      customersData.customers.length;
    
    // Update customers table
    const customersTable = document.getElementById('customersTable');
    if (customersTable) {
      const tbody = customersTable.querySelector('tbody');
      tbody.innerHTML = '';
      
      customersData.customers.forEach(customer => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${customer.id}</td>
          <td>${customer.name}</td>
          <td>${customer.macs.join(', ')}</td>
          <td>${customer.package}</td>
          <td>${customer.expires}</td>
          <td>
            <button class="btn-edit">Edit</button>
            <button class="btn-delete">Delete</button>
          </td>
        `;
        tbody.appendChild(row);
      });
    }
    
  } catch (error) {
    console.error('Failed to load dashboard data:', error);
  }
}

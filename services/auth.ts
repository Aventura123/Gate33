// Company login function
export async function loginCompany(email: string, password: string) {
  try {
    // Changed the endpoint to use /api/company/login instead of /api/company/auth
    const response = await fetch('/api/company/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error('Login error');
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    // Store the token and company data in local storage
    localStorage.setItem('token', data.token);
    localStorage.setItem('company', JSON.stringify(data.company));

    return data.company;
  } catch (error) {
    console.error('Error logging in company:', error);
    throw error;
  }
}
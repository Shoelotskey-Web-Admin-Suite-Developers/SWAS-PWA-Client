/**
 * Utility functions for batch operations with the backend API
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Archive all data from the system by setting is_archive to true
 * @param confirmationCode - Security code to confirm archiving (should match server-side value)
 * @returns Promise with the archiving result
 */
export const archiveAllData = async (confirmationCode: string): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/batch/archive-all`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionStorage.getItem('token')}` // Updated to use sessionStorage
      },
      body: JSON.stringify({ confirmationCode })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to archive data');
    }
    
    return data;
  } catch (error) {
    console.error('Batch archive error:', error);
    throw error;
  }
};

/**
 * Delete all data from the system (kept for backward compatibility)
 * @param confirmationCode - Security code to confirm deletion (should match server-side value)
 * @returns Promise with the deletion result
 */
export const deleteAllData = async (confirmationCode: string): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/batch/delete-all`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionStorage.getItem('token')}` // If using token auth
      },
      body: JSON.stringify({ confirmationCode })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to delete data');
    }
    
    return data;
  } catch (error) {
    console.error('Batch deletion error:', error);
    throw error;
  }
};

/**
 * Get system statistics (counts of records in different collections)
 * @returns Promise with the system stats
 */
export const getSystemStats = async (): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/batch/stats`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sessionStorage.getItem('token')}` // If using token auth
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch system stats');
    }
    
    return data;
  } catch (error) {
    console.error('Fetch stats error:', error);
    throw error;
  }
};
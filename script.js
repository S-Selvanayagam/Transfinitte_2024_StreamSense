const socket = io('http://localhost:3000'); // Adjust to your server address if necessary

// Data structure for the charts
const data = {
    labels: [],  // Will hold the user IDs
    datasets: [{
        label: 'User Scores',
        data: [],  // Will hold the scores
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1
    }]
};

// Initialize charts
const ctx1 = document.getElementById('myChart').getContext('2d');
const ctx2 = document.getElementById('myChart2').getContext('2d');

let chartType = 'bar'; // Default chart type
const myChart1 = new Chart(ctx1, {
    type: chartType,
    data: data,
    options: {
        scales: {
            y: {
                beginAtZero: true
            }
        }
    }
});

const myChart2 = new Chart(ctx2, {
    type: 'line', // Different initial chart type
    data: data,
    options: {
        scales: {
            y: {
                beginAtZero: true
            }
        }
    }
});

// Listen for new data from the backend
socket.on('newData', (newData) => {
    console.log('New Data:', newData);
    
    // Add the new userId and score to the chart data
    data.labels.push(`User ${newData.userId}`);
    data.datasets[0].data.push(newData.score);

    // Update both charts
    myChart1.update();
    myChart2.update();
});

// Function to change chart type
function changeChartType() {
    const selectedType = document.getElementById('chartType').value;
    myChart1.config.type = selectedType; // Change the chart type
    myChart1.update(); // Update the chart to reflect the change
}
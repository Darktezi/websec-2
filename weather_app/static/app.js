const map = L.map('map').setView([60.0, 90.0], 3);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let allCities = [];
let chartTemp = null;
let chartWind = null;
let chartRain = null;
let markersLayer = L.layerGroup().addTo(map);

$('#theme-toggle').on('click', function() {
    $('body').toggleClass('dark-theme');
});

$(document).ready(function() {
    $.ajax({
        url: '/api/cities',
        method: 'GET',
        dataType: 'json',
        success: function(cities) {
            allCities = cities;
            renderMarkers(cities);
            
            $('#loader').fadeOut();
        },
        error: function(err) {
            console.error('Ошибка загрузки городов:', err);
            $('#loader p').text('Ошибка загрузки данных. Проверьте сервер.');
        }
    });
});

function renderMarkers(cities) {
    markersLayer.clearLayers();
    
    cities.forEach(city => {
        const marker = L.marker([city.lat, city.lon]);
        
        marker.bindTooltip(`${city.name} (нас. ${city.pop})`);
        
        marker.on('click', function() {
            openWeatherModal(city);
        });
        
        markersLayer.addLayer(marker);
    });
}

$('#city-search').on('input', function() {
    const query = $(this).val().toLowerCase();
    const $results = $('#search-results');
    
    $results.empty();
    
    if (query.length < 2) return;
    
    const filtered = allCities.filter(c => c.name.toLowerCase().includes(query)).slice(0, 10);
    
    filtered.forEach(city => {
        const $li = $('<li>')
            .html(`<span class="city-name">${city.name}</span>`)
            .on('click', function() {
                map.setView([city.lat, city.lon], 10);
                openWeatherModal(city);
            });
        $results.append($li);
    });
});

function getFormattedDate(daysToAdd = 0) {
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function openWeatherModal(city) {
    $('.tab-btn').removeClass('active');
    $('.tab-btn[data-chart="temp"]').addClass('active');
    $('.chart-container').hide();
    $('#chart-temp').show();

    $('#weather-modal').css('display', 'flex');
    $('#modal-title').text(`Погода: ${city.name}`);
    
    $('#modal-subtitle').text(`Координаты: ${city.lat.toFixed(4)}, ${city.lon.toFixed(4)}`);
    $('#forecast-table-body').empty().append('<tr><td colspan="4">Загрузка прогноза...</td></tr>');

    const dateRange = `${getFormattedDate(0)},${getFormattedDate(6)}`;
    
    const localApiUrl = `/api/weather?lat=${city.lat}&lon=${city.lon}&date=${dateRange}`;
    
    $.ajax({
        url: localApiUrl,
        method: 'GET',
        dataType: 'json',
        success: function(response) {
            console.log("Успешный ответ от сервера:", response);
            
            if (response.error) {
                $('#forecast-table-body').empty().append('<tr><td colspan="4" style="color: red;">Ошибка сервера.</td></tr>');
                return;
            }

            const chartData = parseWeatherData(response);
            
            renderCharts(chartData);
            renderTable(chartData);
        },
        error: function(xhr, status, error) {
            console.error('Ошибка:', error);
            $('#forecast-table-body').empty().append('<tr><td colspan="4" style="color: red;">Ошибка сети.</td></tr>');
        }
    });
}

function parseWeatherData(response) {
    const dataArray = Array.isArray(response) ? response : (response.data || Object.values(response));
    
    const dailyData = {};

    dataArray.forEach(item => {
        if (!item.dt_forecast) return;
        
        const datePart = item.dt_forecast.split('T')[0].split(' ')[0]; 

        if (!dailyData[datePart]) {
            dailyData[datePart] = { temps: [], winds: [], rains: [] };
        }
        
        dailyData[datePart].temps.push(item.temp_2_cel);
        dailyData[datePart].winds.push(item.wind_speed_10);
        dailyData[datePart].rains.push(item.prate || 0);
    });

    const result = { labels: [], tempAvg: [], tempMin: [], tempMax: [], windMax: [], rainSum: [] };

    Object.keys(dailyData).sort().forEach(date => {
        const day = dailyData[date];
        const [yyyy, mm, dd] = date.split('-');
        result.labels.push(`${dd}.${mm}`);

        const minT = Math.min(...day.temps);
        const maxT = Math.max(...day.temps);
        const avgT = (minT + maxT) / 2;
        const maxW = Math.max(...day.winds);
        const sumR = day.rains.reduce((a, b) => a + b, 0);

        result.tempAvg.push(parseFloat(avgT.toFixed(1)));
        result.tempMin.push(parseFloat(minT.toFixed(1)));
        result.tempMax.push(parseFloat(maxT.toFixed(1)));
        result.windMax.push(parseFloat(maxW.toFixed(1)));
        result.rainSum.push(parseFloat(sumR.toFixed(1)));
    });

    return result;
}

$('#close-modal').on('click', function() {
    $('#weather-modal').fadeOut();
});
$('.modal-overlay').on('click', function(e) {
    if (e.target === this) {
        $(this).fadeOut();
    }
});

$('.tab-btn').on('click', function() {

    $('.tab-btn').removeClass('active');
    $(this).addClass('active');
    
    const targetChart = $(this).data('chart');
    
    $('.chart-container').hide();
    
    $(`#chart-${targetChart}`).show();

    if (targetChart === 'temp' && chartTemp) {
        chartTemp.reset();
        chartTemp.update();
    } else if (targetChart === 'wind' && chartWind) {
        chartWind.reset();
        chartWind.update();
    } else if (targetChart === 'rain' && chartRain) {
        chartRain.reset();
        chartRain.update();
    }
});

function renderCharts(data) {
    if (chartTemp) chartTemp.destroy();
    if (chartWind) chartWind.destroy();
    if (chartRain) chartRain.destroy();

    const commonOptions = { responsive: true, maintainAspectRatio: false };

    chartTemp = new Chart($('#canvasTemp')[0], {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Средняя температура (°C)',
                data: data.tempAvg,
                borderColor: '#ff5722',
                backgroundColor: 'rgba(255, 87, 34, 0.2)',
                fill: true,
                tension: 0.4
            }]
        },
        options: commonOptions
    });

    chartWind = new Chart($('#canvasWind')[0], {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Макс. скорость ветра (м/с)',
                data: data.windMax,
                borderColor: '#00bcd4',
                backgroundColor: 'rgba(0, 188, 212, 0.2)',
                fill: true,
                tension: 0.4
            }]
        },
        options: commonOptions
    });

    chartRain = new Chart($('#canvasRain')[0], {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Осадки (мм/сутки)',
                data: data.rainSum,
                borderColor: '#3f51b5',
                backgroundColor: 'rgba(63, 81, 181, 0.2)',
                fill: true,
                tension: 0.4
            }]
        },
        options: commonOptions
    });
}

function renderTable(data) {
    const $tbody = $('#forecast-table-body');
    $tbody.empty(); 

    for (let i = 0; i < data.labels.length; i++) {
        const tr = `
            <tr>
                <td>${data.labels[i]}</td>
                <td style="color: #03a9f4; font-weight: bold;">${data.tempMin[i]}</td>
                <td style="color: #ff5722; font-weight: bold;">${data.tempMax[i]}</td>
                <td>${data.windMax[i]}</td>
            </tr>
        `;
        $tbody.append(tr);
    }
}

$('.popular-cities li').on('click', function() {
    const cityName = $(this).find('.city-name').text();
    
    const city = allCities.find(c => c.name === cityName);
    
    if (city) {
        map.setView([city.lat, city.lon], 10);
        openWeatherModal(city);
    } else {
        console.warn('Город еще не загружен или не найден:', cityName);
    }
});
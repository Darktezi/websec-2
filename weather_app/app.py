from flask import Flask, jsonify, request, send_from_directory
import json
import os
import requests

app = Flask(__name__, static_folder='static')

CITIES_FILE = 'top_1000_cities.json'
if os.path.exists(CITIES_FILE):
    with open(CITIES_FILE, 'r', encoding='utf-8') as f:
        cities_data = json.load(f)
else:
    cities_data = []
    print("Внимание: файл top_1000_cities.json не найден!")

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/api/cities')
def get_cities():
    return jsonify(cities_data)

@app.route('/api/search')
def search_cities():
    query = request.args.get('q', '').lower()
    if not query:
        return jsonify([])
    
    results = [city for city in cities_data if query in city['name'].lower()]
    return jsonify(results[:10])

@app.route('/api/weather')
def get_weather():
    lat = request.args.get('lat')
    lon = request.args.get('lon')
    date_range = request.args.get('date')
    
    API_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzc0ODAwNjkxLCJpYXQiOjE3NzQ4MDAzOTEsImp0aSI6Ijk2MjFlYzhlMmNlMzQwM2JiMWUwZDQwYzY5NWFmYWFhIiwidXNlcl9pZCI6IjM2MDAifQ.4ATe3B_TA1QgWKMj3wgf7UDk48HHq-Z7i36FkSHsgTo'
    
    external_api_url = f"https://projecteol.ru/api/weather/?lat={lat}&lon={lon}&date={date_range}&token={API_TOKEN}"
    
    try:
        response = requests.get(external_api_url)
        return jsonify(response.json())
    except Exception as e:
        print(f"Ошибка при запросе к метео-серверу: {e}")
        return jsonify({"error": "Не удалось получить данные"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
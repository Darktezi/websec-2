import csv
import json

def prepare_cities():
    cities = []
    
    with open('all_settlements.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f, delimiter=';')
        
        for row in reader:
            first_key = list(row.keys())[0]
            
            if row.get(first_key) != 'Населенный пункт':
                continue
                
            try:
                pop_str = row.get('population', '0')
                if not pop_str or pop_str == '0':
                    continue
                    
                pop = int(pop_str)
                
                lat_str = row.get('latitude_dadata', '0')
                lon_str = row.get('longitude_dadata', '0')
                
                if not lat_str or not lon_str:
                    continue
                    
                lat = float(lat_str)
                lon = float(lon_str)
                
                cities.append({
                    'name': row.get('settlement', 'Неизвестно'),
                    'lat': lat,
                    'lon': lon,
                    'pop': pop
                })
            except ValueError:
                continue

    cities.sort(key=lambda x: x['pop'], reverse=True)
    
    top_1000 = cities[:1000]

    with open('top_1000_cities.json', 'w', encoding='utf-8') as f:
        json.dump(top_1000, f, ensure_ascii=False, indent=2)
        
    print("Топ-1000 городов сохранены в файл: top_1000_cities.json")

if __name__ == '__main__':
    prepare_cities()
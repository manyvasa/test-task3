import React from "react";
import { apiKey } from "../config";

export default class App extends React.Component{
  constructor(props) {
    super(props);
    this.state = {
      markersArray: [],
      polyline: null,
      index: 1,
    };

    this.addMarker = this.addMarker.bind(this);
    this.drawPolyline = this.drawPolyline.bind(this);
    this.removeMarker = this.removeMarker.bind(this);

    this.dragOver = this.dragOver.bind(this);
    this.dragEnd = this.dragEnd.bind(this);
    this.dragStart = this.dragStart.bind(this);
  }

  componentDidMount() {
    let self = this;
    loadScript(`https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=3.exp&libraries=geometry,drawing,places`, () => {

      self.map = new google.maps.Map(self.refs.map, { center: {lat: 56.81219033073052, lng: 60.54730486543758},  zoom: 15 });
      self.map.controls[google.maps.ControlPosition.TOP_LEFT].push(self.refs.search);
      self.searchBox = new google.maps.places.SearchBox((self.refs.search))
      self.geocoder = new google.maps.Geocoder;

      google.maps.event.addListener(self.searchBox, 'places_changed', () => {
        const places = self.searchBox.getPlaces();
        const bounds = new google.maps.LatLngBounds();

        if (places.length === 0) return;

        places.forEach((place) => {
          self.addMarker(place.geometry.location);
          bounds.extend(place.geometry.location);
        });

        self.map.fitBounds(bounds);
        self.refs.search.value = '';
      });

      self.map.addListener('click', e => self.addMarker(e.latLng));
    });
  }

  addMarker(latLng) {

    const newMarker = new Promise( resolve => {
      let marker = new google.maps.Marker({
        map: this.map,
        position: latLng,
        draggable: true,
        index: this.state.index
      });

      marker.addListener('dragend', e => {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        const markerIndex = this.state.markersArray.findIndex((item) => item.index === marker.index);
        let newMarkersArray = [ ... this.state.markersArray ];

        newMarkersArray[markerIndex].setPosition({ lat, lng });

        this.geocoder.geocode({'location': { lat, lng }}, (results, status) => {
          newMarkersArray[markerIndex].adress = status === 'OK' ? results[0].formatted_address : 'address not found';
          this.setState({markersArray: newMarkersArray}, this.drawPolyline)
        })
      });

      this.geocoder.geocode({'location': { lat: latLng.lat(), lng: latLng.lng() }}, (results, status) => {
        marker.adress = status === 'OK' ? results[0].formatted_address : 'address not found'
        resolve(marker)
      });
    });

    newMarker.then((marker) => {
      this.setState(prevState => ({
        markersArray: [ ...prevState.markersArray, marker ],
      }), () => {
        this.state.index = this.state.index + 1;
        this.drawPolyline()
      });
    })

  }

  drawPolyline() {
    let markersPositionArray = [];

    this.state.markersArray.forEach( e => {
      markersPositionArray.push(e.getPosition());
    });

    if (this.state.polyline !== null) {
      this.state.polyline.setMap(null);
    }

    this.state.polyline = new google.maps.Polyline({
      map: this.map,
      path: markersPositionArray,
      strokeOpacity: 0.4
    });
  }

  removeMarker(index) {
    let newMarkersArray = [ ...this.state.markersArray ]
    newMarkersArray[index].setMap(null);
    newMarkersArray.splice(index, 1)
    this.setState({markersArray: newMarkersArray}, this.drawPolyline)
  }

  dragStart(e) {
    this.dragged = e.currentTarget;
  }

  dragEnd(e) {
    this.dragged.style.display = 'flex';

    e.target.classList.remove("drag-up");
    this.over.classList.remove("drag-up");

    e.target.classList.remove("drag-down");
    this.over.classList.remove("drag-down");


    let mutableMarkersArray = this.state.markersArray;
    const from = Number(this.dragged.dataset.id);
    const to = Number(this.over.dataset.id);
    mutableMarkersArray.splice(to, 0, mutableMarkersArray.splice(from, 1)[0]);

    mutableMarkersArray = mutableMarkersArray.map((marker, index)=> {
      marker.index = index + 1;
      return marker;
    })

    this.setState({markersArray: mutableMarkersArray}, this.drawPolyline);
  }

  dragOver(e) {
    e.preventDefault();

    this.dragged.style.display = "none";

    if (e.target.tagName !== "LI") {
      return;
    }


    const dgIndex = JSON.parse(this.dragged.dataset.item).index;
    const taIndex = JSON.parse(e.target.dataset.item).index;
    const animateName = dgIndex > taIndex ? "drag-up" : "drag-down";


    if (this.over && e.target.dataset.item !== this.over.dataset.item) {
      this.over.classList.remove("drag-up", "drag-down");
    }

    if(!e.target.classList.contains(animateName)) {
      e.target.classList.add(animateName);
      this.over = e.target;
    }
  }

  render() {
    const markers = this.state.markersArray;

    return(
      <div className="wrap">
        <div ref="map" className="map">
          <input ref="search" type="text" className="map__search-input"/>
          The map did not load
        </div>

        {markers.length > 0 ?
          <ul className="list" onDragOver={this.dragOver}>

            {markers.map((marker, index) => (
              <li
                key={index}
                className="item"
                data-id={index}
                draggable="true"
                onDragEnd={this.dragEnd}
                onDragStart={this.dragStart}
                data-item={JSON.stringify(marker.index)}
              >
                <div className="item__label">
                  <span>{ marker.adress }</span>
                </div>
                <div className="item__control">
                  <button onClick={() => {this.removeMarker(index)}}>Удалить</button>
                </div>
              </li>
            )) }
          </ul> : <div className="list__empty">Для добавления пункта воспользуйтесь строкой поиска</div>
        }
      </div>
    )
  }
}

function loadScript(url, callback) {
  const head = document.getElementsByTagName('head')[0];
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = url;

  script.onreadystatechange = callback;
  script.onload = callback;

  head.appendChild(script);
}

import React, { useEffect, useRef, useState } from "react";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import "./Map.css";
import * as maptilerweather from "@maptiler/weather";

export default function Map() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const MD = { lng: 28.3896969, lat: 46.9803875 };
  const [zoom] = useState(10);
  const [weatherInfo, setWeatherInfo] = useState("");
  const [layer, setLayer] = useState("wind");
  const [playPauseButton, setPlayPauseButton] = useState(false);
  const [sliderTimeInfo, setSliderTimeInfo] = useState(Date);

  maptilersdk.config.apiKey = "34reqe0ApIH5b9TTP43k";

  let activeLayer: any = null;
  let weatherLayer = null;
  let pointerLngLat = null;
  let currentTime = null;

  useEffect(() => {
    //create the base wind layer
    const dataWind = new maptilerweather.WindLayer();

    //get button id
    document
      .getElementById("buttons")
      .addEventListener("click", function (event) {
        changeWeatherLayer(event.target.id);
        setLayer(event.target.id);
      });

    // stops map from intializing more than once
    if (map.current) return;

    //create the base map background
    map.current = new maptilersdk.Map({
      container: mapContainer.current,
      style: maptilersdk.MapStyle.BACKDROP.DARK,
      center: [MD.lng, MD.lat],
      zoom: zoom,
      hash: true,
      antialias: true, // create the gl context with MSAA antialiasing, so custom layers are antialiased,
    });

    function initWeatherMap(layer: string) {
      if (layer === null) layer = "wind";
      weatherLayer = changeWeatherLayer(layer);

      return weatherLayer;
    }

    //create object layer, witch will be at the base of all other layers
    const windLayer = new maptilerweather.WindLayer({
      id: "wind_1",
      speed: dataWind.particleSpeed,
      fadeFactor: dataWind.fadeFactor,
      maxAmount: dataWind.numParticles,
      density: dataWind.particleDensity,
      size: dataWind.particleSize,
      opacity: 0.2,
      color: dataWind.particleColor,
      fastColor: dataWind.particleFastColor,
      // color: [0, 0, 0, 30],
      // fastColor: [0, 0, 0, 100],
      fastIsLarger: true,
    });
    //set background water color, and also add layers
    map.current.on("load", function () {
      map.current.setPaintProperty("Water", "fill-color", "rgba(0,0,0, 0.4)");
      map.current.addLayer(windLayer, "Water", { opacity: 0.4 });
      map.current.addLayer(initWeatherMap(layer), "Water");
    });

    map.current.on("mouseout", function (evt) {
      if (!evt.originalEvent.relatedTarget) {
        pointerLngLat = null;
      }
    });

    map.current.on("mouseout", function (evt) {
      if (!evt.originalEvent.relatedTarget) {
        setWeatherInfo("0");
        pointerLngLat = null;
      }
    });

    map.current.on("mousemove", (e: any) => {
      updatePointerValue(e.lngLat);
    });

    // set marker
    new maptilersdk.Marker({ color: "#FF0000" })
      .setLngLat([MD.lng, MD.lat])
      .addTo(map.current);

    const timeSlider = document.getElementById("time-slider");

    function createSliderData(weatherLayer: any) {
      weatherLayer?.on("sourceReady", (event) => {
        const startDate = weatherLayer.getAnimationStartDate();
        const endDate = weatherLayer.getAnimationEndDate();
        let currentDate = weatherLayer.getAnimationTimeDate();

        timeSlider.min = +startDate;

        timeSlider.max = +endDate;

        timeSlider.value = +currentDate;

        timeSlider.addEventListener("input", function (e) {
          const d = weatherLayer.getAnimationTimeDate();
          //set changing forecast text
          setSliderTimeInfo(d.toString());
          //set step of the forecast slider
          //The forecast is showing from present time, but if json was emitted earlier, then now time,
          //the slider will be a step ahead
          weatherLayer?.setAnimationTime(timeSlider.value / 1000);
        });
      });
    }

    function createWeatherLayer(layer: string) {
      let weatherLayer = null;
      switch (layer) {
        case "precipitation":
          weatherLayer = new maptilerweather.PrecipitationLayer({
            id: "precipitation",
            colorramp: maptilerweather.ColorRamp.builtin.PRECIPITATION,
            opacity: 0.9,
          });
          createSliderData(weatherLayer);
          playStopBtn(weatherLayer);
          break;
        case "cloud":
          weatherLayer = new maptilerweather.RadarLayer({
            opacity: 0.9,
            colorramp: maptilerweather.ColorRamp.builtin.RADAR_CLOUD,
            id: "cloud",
            smooth: true,
          });
          //Using the animateByFactor(3600) function of the precipitation layer, we animate it in time (next 4 days). Each second of animation corresponds to one hour.
          createSliderData(weatherLayer);
          playStopBtn(weatherLayer);
          break;
        case "temperature":
          weatherLayer = new maptilerweather.TemperatureLayer({
            id: "temperature",
            colorramp: maptilerweather.ColorRamp.builtin.TEMPERATURE_2,
            opacity: 1,
            smooth: true,
          });
          createSliderData(weatherLayer);
          playStopBtn(weatherLayer);
          break;
        case "wind":
          weatherLayer = new maptilerweather.WindLayer({
            id: "wind",
            speed: dataWind.particleSpeed,
            fadeFactor: dataWind.fadeFactor,
            maxAmount: dataWind.numParticles,
            density: dataWind.particleDensity,
            size: dataWind.particleSize,
            opacity: dataWind.fadeFactor,
            color: dataWind.particleColor,
            fastColor: dataWind.particleFastColor,
            fastIsLarger: true,
          });
          createSliderData(weatherLayer);
          playStopBtn(weatherLayer);
          break;
      }
      return weatherLayer;
    }

    // text with wind speed/ temperature
    function updatePointerValue(lngLat: any) {
      if (!lngLat) return;
      pointerLngLat = lngLat;

      const weatherLayer = map.current.getLayer(activeLayer)?.implementation;

      if (weatherLayer) {
        const value = weatherLayer.pickAt(lngLat.lng, lngLat.lat);
        if (!value) {
          setWeatherInfo("0");
          return;
        }
        switch (weatherLayer.id) {
          case "wind":
            setWeatherInfo(value.speedMetersPerSecond.toFixed(1) + " m/s");
            break;
          case "temperature":
            setWeatherInfo(value.value.toFixed(1) + " °C");
            break;
          case "cloud":
            setWeatherInfo(value.value.toFixed(1) + " dBZ");
            break;
          case "precipitation":
            setWeatherInfo(value.value.toFixed(1) + " mm");
            break;
        }
      }
    }

    function changeWeatherLayer(layer: string) {
      if (layer !== activeLayer) {
        if (map.current.getLayer(activeLayer)) {
          const activeWeatherLayer = createWeatherLayer(layer);
          if (activeWeatherLayer) {
            currentTime = activeWeatherLayer.getAnimationTime();

            map.current.setLayoutProperty(activeLayer, "visibility", "none");
          }
        }
        activeLayer = layer;
        const weatherLayer =
          createWeatherLayer(layer) || createWeatherLayer(activeLayer);

        if (map.current.getLayer(activeLayer)) {
          map.current.setLayoutProperty(activeLayer, "visibility", "visible");
        } else {
          map.current.addLayer(createWeatherLayer(layer), "Water");
        }

        return weatherLayer;
      }
    }
    function playStopBtn(weatherLayer: any) {
      let isActive = false;

      weatherLayer.on("sourceReady", () => {
        document
          .getElementById("play-pause-bt")
          .addEventListener("click", function () {
            if (isActive) {
              weatherLayer?.animateByFactor(0);
              const d = weatherLayer?.getAnimationTimeDate();
              timeSlider.value = +d;
              //set changing forecast text
              setSliderTimeInfo(d.toString());
              console.log(sliderTimeInfo);
              weatherLayer?.setAnimationTime(timeSlider.value / 1000);
            } else {
              weatherLayer?.animateByFactor(3600);
            }
            isActive = !isActive;
          });
        function refreshTime() {
          const d = weatherLayer.getAnimationTimeDate();
          setSliderTimeInfo(d.toString());
          timeSlider.value = +d;
        }
        // Called when the animation is progressing
        weatherLayer?.on("tick", (event) => {
          refreshTime();
          updatePointerValue(pointerLngLat);
        });

        // Called when the time is manually set
        weatherLayer?.on("animationTimeSet", (event) => {
          refreshTime();
        });
      });
    }

    const geojson = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            message: "Foo",
          },
          geometry: {
            type: "Point",
            width: "50px",
            height: "100px",
            coordinates: [29.41114, 46.63674],
          },
        },
        {
          type: "Feature",
          properties: {
            message: "Foo",
          },
          geometry: {
            type: "Point",
            width: "50px",
            height: "100px",
            coordinates: [28.60774, 47.14216],
          },
        },
      ],
    };
    // add markers to map
    geojson.features.forEach((marker) => {
      // create a DOM element for the marker
      const el = document.createElement("div");
      el.className = "marker";
      el.style.backgroundImage = `url(https://media.tenor.com/9q33bKxQ9DAAAAAi/wind-tower-windmills.gif)`;
      el.style.width = `50px`;
      el.style.height = `100px`;
      el.style.backgroundRepeat = "no-repeat";
      el.style.backgroundSize = "contain";

      // el.addEventListener("click", () => {
      //   window.alert(marker.properties.message);
      // });
      // add marker to map
      new maptilersdk.Marker({ element: el })
        // @ts-ignore
        .setLngLat(marker.geometry.coordinates)
        .addTo(map.current);
    });
  }, [MD.lng, MD.lat, zoom, sliderTimeInfo]);

  return (
    <div className="map-wrap">
      <div ref={mapContainer} className="map" />
      <div id="map">
        <ul id="buttons">
          <li id="temperature" className="btn btn-primary button">
            Temperature
          </li>
          <li id="wind" className="btn btn-primary button">
            Wind
          </li>
          <li id="cloud" className="btn btn-primary button">
            Cloud
          </li>
          <li
            id="precipitation"
            className="btn btn-primary button"
            onClick={(e) => {
              setLayer(e.target.id);
            }}
          >
            Precipitation
          </li>
        </ul>
        <span className="infoText">{weatherInfo}</span>
      </div>
      <div id={"time-info"}>
        <span id={"time-text"}>{sliderTimeInfo}</span>
        <button
          id={"play-pause-bt"}
          onClick={() => setPlayPauseButton(!playPauseButton)}
        >
          {playPauseButton ? "Pause" : "Play  3600x"}
        </button>
        <input
          type={"range"}
          id={"time-slider"}
          min={0}
          max={11}
          step={1}
          defaultValue={0}
        />
      </div>
    </div>
  );
}

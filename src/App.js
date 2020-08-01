import React, { useState, useRef, useEffect } from "react";
import DeckGL, { LineLayer, ScatterplotLayer } from "deck.gl";
import { StaticMap } from "react-map-gl";
import data from "./data/pedinfo-levels-bw.json";
import 'mapbox-gl/dist/mapbox-gl.css';
import 'antd/dist/antd.css';
import { createBrowserHistory } from 'history';
import queryString from 'query-string';
import Checkbox from 'antd/lib/checkbox';
import Radio from 'antd/lib/radio';
import './App.css';

const MAPBOX_ACCESS_TOKEN =
  "pk.eyJ1IjoiaGFsYXphciIsImEiOiJja2N0dXI2Y3kxbTBoMnBxcTJnaTl3czVxIn0.MXzwZHuwNaOPKZgO17_YmA";


function formatHoverInfo(hoverInfo, mode, levels) {
  if (!hoverInfo || !hoverInfo.object) {
    return null;
  }
  const o = hoverInfo.object;
  const a = get_activity(o, mode, levels);

  let text = o.level ? o.name : a > 0 ? a : null;
  if (text === null) {
    return null;
  }
  return (
    <div
      style={{
        position: 'absolute',
        zIndex: 400,
        backgroundColor: 'black',
        padding: '5px',
        color: 'white',
        pointerEvents: 'none',
        left: hoverInfo.x,
        top: hoverInfo.y
      }}>
      {text}
    </div>
  );
}

export default () => {

  const initialViewState = {
    longitude: -71.2192,
    latitude: 42.330,
    zoom: 12
  };


  const [showRadius, setShowRadius] = useState(false);
  const [satellite, setSatellite] = useState(false);
  const [showEs, setShowEs] = useState(true);
  const [showMs, setShowMs] = useState(true);
  const [showHs, setShowHs] = useState(true);
  const [mode, setMode] = useState('walk');

  const [hoverInfo, setHoverInfo] = useState(null);
  const levels = { es: showEs, ms: showMs, hs: showHs };

  const [viewState, setViewState] = useState(initialViewState);
  // const [debouncedViewState] = useDebounce(viewState, 500);
  const historyRef = useRef();

  function pushHistory(viewState) {
    const d = {
      rad: showRadius ? 1 : 0,
      es: showEs ? 1 : 0,
      ms: showMs ? 1 : 0,
      hs: showHs ? 1 : 0,
      sat: satellite ? 1 : 0,
      lat: viewState.latitude.toFixed(6),
      lng: viewState.longitude.toFixed(6),
      z: viewState.zoom.toFixed(2),
      mode,
    };
    const uri = new URL(document.URL);
    uri.search = queryString.stringify(d);
    historyRef.current.replace(uri.href);
  }


  const handleHistory = (location, action) => {
    if (action === 'POP' || action === 'X-INIT') {
      const query = queryString.parse(location.search);
      if (query.rad !== undefined) {
        setShowRadius(parseInt(query.rad));
      }
      if (query.es !== undefined) {
        setShowEs(parseInt(query.es));
      }
      if (query.ms !== undefined) {
        setShowMs(parseInt(query.ms));
      }
      if (query.hs !== undefined) {
        setShowHs(parseInt(query.hs));
      }
      if (query.sat !== undefined) {
        setSatellite(parseInt(query.sat));
      }
      if (query.mode !== undefined) {
        setMode(query.mode);
      }
      const viewUpdate = {};
      if (query.lat !== undefined) {
        viewUpdate.latitude = parseFloat(query.lat);
      }
      if (query.lng !== undefined) {
        viewUpdate.longitude = parseFloat(query.lng);
      }
      if (query.z !== undefined) {
        viewUpdate.zoom = parseFloat(query.z);
      }
      setViewState(Object.assign({}, viewState, viewUpdate));
    }
  }

  /* 
  useEffect(() => {
    const history = createBrowserHistory({
      basename: new URL(document.URL).pathname
    });

    const unlisten = history.listen(handleHistory);
    handleHistory(history.location, 'X-INIT');
    historyRef.current = history;
    return unlisten;
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    // pushHistory();
    // eslint-disable-next-line
  }, [showRadius, showEs, showMs, showHs, mode, satellite]);
*/

  return (
    <div className="App">
      <div className="controls">
        <h1>Desire lines to Newton school</h1>
        <div>
          <Checkbox
            checked={showEs}
            onChange={e => setShowEs(e.target.checked)}>Elementary</Checkbox>
          <Checkbox
            checked={showMs}
            onChange={e => setShowMs(e.target.checked)}>Middle</Checkbox>
          <Checkbox
            checked={showHs}
            onChange={e => setShowHs(e.target.checked)}>High Schools</Checkbox>
        </div>
        <div style={{ paddingTop: "15px" }}>
          <Checkbox checked={showRadius}
            onChange={e => { setShowRadius(e.target.checked) }}>Show distance</Checkbox>
          <Checkbox checked={satellite}
            onChange={e => setSatellite(e.target.checked)}>Satellite</Checkbox>
        </div>
        <div style={{ paddingTop: "15px" }}>
          <Radio.Group buttonStyle="solid"
            value={mode}
            onChange={e => setMode(e.target.value)}>
            <Radio value="walk">walk</Radio>
            <Radio value="bike">walk &amp; bike</Radio>
          </Radio.Group>
        </div>
      </div>
      <div style={{ width: 0, height: 0 }} >
        <DeckGL
          initialViewState={initialViewState}
          // viewState={viewState}
          // onViewStateChange={({ viewState }) => pushHistory(viewState)}
          controller={true}
          layers={getLayers(data, mode, levels,
            showRadius,
            setHoverInfo)}
          onHover={d => { setHoverInfo(d, mode, levels) }}
        >
          <div>
            {formatHoverInfo(hoverInfo, mode, levels)}
          </div>

          <StaticMap
            mapStyle={satellite ?
              "mapbox://styles/mapbox/satellite-streets-v11" :
              "mapbox://styles/mapbox/outdoors-v11"}
            mapboxApiAccessToken={MAPBOX_ACCESS_TOKEN}
          />
        </DeckGL>
      </div>
    </div>
  );
}

function getLayers(data, mode, levels, showRadius, setHoverInfo) {

  const scatterplot = new ScatterplotLayer({
    id: `scatterplot-${Date.now()}`,
    data: data.intersections,
    opacity: 0.5,
    radiusUnits: 'meters',
    radiusMaxPixels: 50,
    radiusMinPixels: 3,
    filled: true,
    stroked: true,
    autoHighlight: true,
    getFillColor: d => [160, 180, 255, get_activity(d, mode, levels) ? 255 : 0],
    getLineColor: d => [50, 50, 50, get_activity(d, mode, levels) ? 255 : 0],
    pickable: true,

    getRadius: d => Math.sqrt(get_activity(d, mode, levels)) / 4,

  });

  const lineLayer = new LineLayer({
    id: `line-${Date.now()}`,
    data: data.segments,
    opacity: 0.15,
    radiusUnits: 'meters',
    getColor: d => [255, 150, 20, get_activity(d, mode, levels) ? 255 : 0],
    widthScale: 1,
    widthMaxPixels: 50,
    widthMinPixels: 2,
    autoHighlight: true,
    highlightColor: [200, 100, 0, 128],

    pickable: true,

    getWidth: d => Math.sqrt(get_activity(d, mode, levels)) / 2
  });

  const rcircles = [];
  for (const s of data.schools) {
    for (const r of [800, 1600]) {
      rcircles.push({
        position: s.position,
        radius: r,
        level: s.level,
        name: s.name,
      });
    }
  }

  const radiusLayer = new ScatterplotLayer({
    id: `radius-${Date.now()}`,
    data: rcircles,
    radiusUnits: 'meters',
    stroked: true,
    filled: false,
    pickable: false,
    getRadius: d => d.radius,
    lineWidthMinPixels: 2,
    lineWidthMaxPixels: 2,

    getLineColor: s => [0, 0, 0, showRadius && get_school_active(s, levels) ? 64 : 0],
  });

  const schoolLayer = new ScatterplotLayer({
    id: `school-${Date.now()}`,
    data: data.schools,
    radiusUnits: 'meters',
    stroked: false,
    opacity: 0.4,
    filled: true,
    pickable: true,
    getRadius: 30,
    radiusMinPixels: 8,

    getFillColor: d => [255, 50, 50, get_school_active(d, levels) ? 255 : 0],
    lineWidthMinPixels: 2,
    lineWidthMaxPixels: 2,
    getLineColor: s => [0, 0, 0, get_school_active(s, levels) ? 64 : 0],
  });

  return [radiusLayer, lineLayer, scatterplot, schoolLayer];
}
function get_school_active(s, levels) {

  return levels[s.level];
}

function get_activity(d, mode, levels) {

  if (!d.activity) {
    return 0;
  }
  let x = 0;

  const activity = d.activity[mode];
  for (const level of ['es', 'ms', 'hs']) {
    if (levels[level]) {
      x += activity[level];
    }
  }
  return x;
}


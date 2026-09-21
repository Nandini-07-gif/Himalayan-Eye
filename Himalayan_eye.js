// ============================================================
// HIMALAYAN EYE
// AI-Based Satellite Monitoring of Himalayan Cryosphere Change
// ============================================================


// ============================================================
// STEP 4 — LANDSAT DATA + CLOUD MASKING + INDICES
// ============================================================

// ------------------------------------------------------------
// 1. CHHOTA SHIGRI STUDY REGION
// ------------------------------------------------------------

var roi = ee.Geometry.Rectangle([
  77.49, 32.19,
  77.55, 32.28
]);

Map.centerObject(roi, 12);


// ------------------------------------------------------------
// 2. CLOUD / SHADOW MASK
// Landsat Collection 2 Level-2
// Bit 3 = Cloud
// Bit 4 = Cloud Shadow
// ------------------------------------------------------------

function maskLandsat(image) {

  var qa = image.select('QA_PIXEL');

  var cloud = qa.bitwiseAnd(1 << 3).eq(0);
  var shadow = qa.bitwiseAnd(1 << 4).eq(0);

  return image
    .updateMask(cloud)
    .updateMask(shadow)
    .select([
      'SR_B2',
      'SR_B3',
      'SR_B4',
      'SR_B5',
      'SR_B6',
      'SR_B7'
    ])
    .multiply(0.0000275)
    .add(-0.2)
    .copyProperties(
      image,
      ['system:time_start']
    );
}


// ------------------------------------------------------------
// 3. ADD SPECTRAL INDICES
// ------------------------------------------------------------

function addIndices(image) {

  var ndsi = image
    .normalizedDifference([
      'SR_B3',
      'SR_B6'
    ])
    .rename('NDSI');

  var ndvi = image
    .normalizedDifference([
      'SR_B5',
      'SR_B4'
    ])
    .rename('NDVI');

  var ndwi = image
    .normalizedDifference([
      'SR_B3',
      'SR_B5'
    ])
    .rename('NDWI');

  return image
    .addBands(ndsi)
    .addBands(ndvi)
    .addBands(ndwi);
}


// ============================================================
// 4. LANDSAT 8 — 2015
// ============================================================

var landsat2015 = ee.ImageCollection(
  'LANDSAT/LC08/C02/T1_L2'
)
.filterBounds(roi)
.filterDate(
  '2015-06-01',
  '2015-10-01'
)
.filter(
  ee.Filter.lt(
    'CLOUD_COVER',
    30
  )
)
.map(maskLandsat)
.map(addIndices);

var image2015 = landsat2015
  .median()
  .clip(roi);


// ============================================================
// 5. LANDSAT 8 — 2020
// ============================================================

var landsat2020 = ee.ImageCollection(
  'LANDSAT/LC08/C02/T1_L2'
)
.filterBounds(roi)
.filterDate(
  '2020-06-01',
  '2020-10-01'
)
.filter(
  ee.Filter.lt(
    'CLOUD_COVER',
    30
  )
)
.map(maskLandsat)
.map(addIndices);

var image2020 = landsat2020
  .median()
  .clip(roi);


// ============================================================
// 6. LANDSAT 8 + LANDSAT 9 — 2025
// ============================================================

var landsat8_2025 = ee.ImageCollection(
  'LANDSAT/LC08/C02/T1_L2'
)
.filterBounds(roi)
.filterDate(
  '2025-06-01',
  '2025-10-01'
)
.filter(
  ee.Filter.lt(
    'CLOUD_COVER',
    30
  )
)
.map(maskLandsat)
.map(addIndices);


var landsat9_2025 = ee.ImageCollection(
  'LANDSAT/LC09/C02/T1_L2'
)
.filterBounds(roi)
.filterDate(
  '2025-06-01',
  '2025-10-01'
)
.filter(
  ee.Filter.lt(
    'CLOUD_COVER',
    30
  )
)
.map(maskLandsat)
.map(addIndices);


var image2025 = landsat8_2025
  .merge(landsat9_2025)
  .median()
  .clip(roi);


// ============================================================
// 7. CHECK IMAGE COUNTS
// ============================================================

print('========================================');
print('LANDSAT IMAGE COUNTS');
print('========================================');

print(
  '2015 images:',
  landsat2015.size()
);

print(
  '2020 images:',
  landsat2020.size()
);

print(
  '2025 Landsat 8 images:',
  landsat8_2025.size()
);

print(
  '2025 Landsat 9 images:',
  landsat9_2025.size()
);


// ============================================================
// 8. TRUE COLOR VISUALIZATION
// ============================================================

var rgbVis = {
  bands: [
    'SR_B4',
    'SR_B3',
    'SR_B2'
  ],
  min: 0.02,
  max: 0.30
};


// Only 2015 is visible initially.
// 2020 and 2025 stay OFF to reduce rendering load.

Map.addLayer(
  image2015.select([
    'SR_B4',
    'SR_B3',
    'SR_B2'
  ]),
  rgbVis,
  'Chhota Shigri — 2015',
  true
);

Map.addLayer(
  image2020.select([
    'SR_B4',
    'SR_B3',
    'SR_B2'
  ]),
  rgbVis,
  'Chhota Shigri — 2020',
  false
);

Map.addLayer(
  image2025.select([
    'SR_B4',
    'SR_B3',
    'SR_B2'
  ]),
  rgbVis,
  'Chhota Shigri — 2025',
  false
);


// ============================================================
// 9. NDSI VISUALIZATION
// ============================================================

var ndsiVis = {
  min: -0.5,
  max: 1,
  palette: [
    'brown',
    'yellow',
    'white'
  ]
};

Map.addLayer(
  image2015.select('NDSI'),
  ndsiVis,
  'NDSI — 2015',
  false
);

Map.addLayer(
  image2020.select('NDSI'),
  ndsiVis,
  'NDSI — 2020',
  false
);

Map.addLayer(
  image2025.select('NDSI'),
  ndsiVis,
  'NDSI — 2025',
  false
);


// ============================================================
// 10. BAND INFORMATION
// ============================================================

print(
  '2015 bands:',
  image2015.bandNames()
);

print(
  '2020 bands:',
  image2020.bandNames()
);

print(
  '2025 bands:',
  image2025.bandNames()
);


// ============================================================
// STEP 5 — TRAINING DATA
// ============================================================
//
// geometry  = 4 Snow/Ice polygons
// geometry2 = 4 Rock/Bare-land polygons
// geometry3 = 4 Water polygons
//
// Classes:
// 0 = Snow/Ice
// 1 = Rock/Bare land
// 2 = Water
// ============================================================


// ------------------------------------------------------------
// 11. CREATE LABELED TRAINING POLYGONS
// ------------------------------------------------------------

var snow = ee.FeatureCollection([
  ee.Feature(
    geometry,
    {
      class: 0
    }
  )
]);

var rock = ee.FeatureCollection([
  ee.Feature(
    geometry2,
    {
      class: 1
    }
  )
]);

var water = ee.FeatureCollection([
  ee.Feature(
    geometry3,
    {
      class: 2
    }
  )
]);

var trainingPolygons = snow
  .merge(rock)
  .merge(water);

print(
  'Training polygons:',
  trainingPolygons
);


// ============================================================
// STEP 6 — RANDOM FOREST
// ============================================================


// ------------------------------------------------------------
// 12. FEATURES FOR MACHINE LEARNING
// ------------------------------------------------------------

var bands = [
  'SR_B2',
  'SR_B3',
  'SR_B4',
  'SR_B5',
  'SR_B6',
  'SR_B7',
  'NDSI',
  'NDVI',
  'NDWI'
];


// ------------------------------------------------------------
// 13. EXTRACT TRAINING PIXELS
// ------------------------------------------------------------
//
// IMPORTANT:
// geometries = false
// This prevents Earth Engine from storing geometry
// for every individual pixel.
//
// tileScale = 4
// Helps reduce memory pressure.
// ------------------------------------------------------------

var snowSamples = image2015
  .select(bands)
  .sampleRegions({
    collection: snow,
    properties: ['class'],
    scale: 30,
    geometries: false,
    tileScale: 4
  });

var rockSamples = image2015
  .select(bands)
  .sampleRegions({
    collection: rock,
    properties: ['class'],
    scale: 30,
    geometries: false,
    tileScale: 4
  });

var waterSamples = image2015
  .select(bands)
  .sampleRegions({
    collection: water,
    properties: ['class'],
    scale: 30,
    geometries: false,
    tileScale: 4
  });


// ------------------------------------------------------------
// 14. LIMIT SAMPLE SIZE
// ------------------------------------------------------------
//
// We do NOT need every pixel.
// 2,000 pixels per class is already plenty
// for this beginner-sized Random Forest project.
// ------------------------------------------------------------

var snowSamplesLimited = snowSamples
  .randomColumn('random', 42)
  .sort('random')
  .limit(2000);

var rockSamplesLimited = rockSamples
  .randomColumn('random', 42)
  .sort('random')
  .limit(2000);

var waterSamplesLimited = waterSamples
  .randomColumn('random', 42)
  .sort('random')
  .limit(2000);


// ------------------------------------------------------------
// 15. COMBINE ALL TRAINING SAMPLES
// ------------------------------------------------------------

var samples2015 = snowSamplesLimited
  .merge(rockSamplesLimited)
  .merge(waterSamplesLimited);

print(
  'Total ML samples:',
  samples2015.size()
);

print(
  'Samples by class:',
  samples2015.aggregate_histogram('class')
);


// ============================================================
// STEP 7 — TRAIN / VALIDATION SPLIT
// ============================================================

var samplesRandom = samples2015
  .randomColumn(
    'split',
    42
  );

var trainingSamples = samplesRandom
  .filter(
    ee.Filter.lt(
      'split',
      0.8
    )
  );

var validationSamples = samplesRandom
  .filter(
    ee.Filter.gte(
      'split',
      0.8
    )
  );

print(
  'Training samples:',
  trainingSamples.size()
);

print(
  'Validation samples:',
  validationSamples.size()
);


// ============================================================
// STEP 8 — TRAIN RANDOM FOREST
// ============================================================

var classifier = ee.Classifier.smileRandomForest({
  numberOfTrees: 100,
  seed: 42
}).train({
  features: trainingSamples,
  classProperty: 'class',
  inputProperties: bands
});

print(
  'Random Forest classifier:',
  classifier
);


// ============================================================
// STEP 9 — MODEL VALIDATION
// ============================================================

var validated = validationSamples
  .classify(classifier);

var confusionMatrix = validated
  .errorMatrix(
    'class',
    'classification'
  );

print(
  '========================================'
);

print(
  'CONFUSION MATRIX',
  confusionMatrix
);

print(
  'OVERALL ACCURACY:',
  confusionMatrix.accuracy()
);

print(
  'KAPPA:',
  confusionMatrix.kappa()
);


// ============================================================
// STEP 10 — CLASSIFY 2015 / 2020 / 2025
// ============================================================

var classified2015 = image2015
  .select(bands)
  .classify(classifier);

var classified2020 = image2020
  .select(bands)
  .classify(classifier);

var classified2025 = image2025
  .select(bands)
  .classify(classifier);


// ============================================================
// STEP 11 — CLASSIFICATION VISUALIZATION
// ============================================================
//
// 0 = Snow/Ice
// 1 = Rock/Bare land
// 2 = Water
// ============================================================

var classVis = {
  min: 0,
  max: 2,
  palette: [
    'white',
    'brown',
    'blue'
  ]
};


// IMPORTANT:
// Keep ALL classification layers OFF initially.
// Turn them on one at a time from the Layers panel.

Map.addLayer(
  classified2015,
  classVis,
  'ML Classification — 2015',
  false
);

Map.addLayer(
  classified2020,
  classVis,
  'ML Classification — 2020',
  false
);

Map.addLayer(
  classified2025,
  classVis,
  'ML Classification — 2025',
  false
);


// ============================================================
// STEP 12 — FEATURE IMPORTANCE
// ============================================================

var explanation = classifier.explain();

print(
  'Random Forest explanation:',
  explanation
);


// ============================================================
// FINAL STATUS
// ============================================================

print('========================================');
print('HIMALAYAN EYE — STEP 5 COMPLETE');
print('========================================');

print('Class 0 = Snow/Ice');
print('Class 1 = Rock/Bare land');
print('Class 2 = Water');

print(
  'Next: evaluate accuracy and calculate area change.'
);
// ============================================================
// HIMALAYAN EYE
// STEP 6 — CLASS AREA CALCULATION
// ============================================================

// ------------------------------------------------------------
// FUNCTION TO CALCULATE AREA FOR EACH CLASS
// ------------------------------------------------------------

function calculateClassAreas(classifiedImage, year) {

  var pixelArea = ee.Image.pixelArea();

  // ----------------------------------------------------------
  // SNOW / ICE — CLASS 0
  // ----------------------------------------------------------

  var snowArea = pixelArea
    .updateMask(
      classifiedImage.eq(0)
    )
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: roi,
      scale: 30,
      maxPixels: 1e9,
      tileScale: 4
    })
    .get('area');

  // ----------------------------------------------------------
  // ROCK / BARE LAND — CLASS 1
  // ----------------------------------------------------------

  var rockArea = pixelArea
    .updateMask(
      classifiedImage.eq(1)
    )
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: roi,
      scale: 30,
      maxPixels: 1e9,
      tileScale: 4
    })
    .get('area');

  // ----------------------------------------------------------
  // WATER — CLASS 2
  // ----------------------------------------------------------

  var waterArea = pixelArea
    .updateMask(
      classifiedImage.eq(2)
    )
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: roi,
      scale: 30,
      maxPixels: 1e9,
      tileScale: 4
    })
    .get('area');

  // ----------------------------------------------------------
  // CONVERT m² → km²
  // ----------------------------------------------------------

  return ee.Feature(
    null,
    {
      year: year,

      snow_ice_km2:
        ee.Number(snowArea)
          .divide(1000000),

      rock_bare_km2:
        ee.Number(rockArea)
          .divide(1000000),

      water_km2:
        ee.Number(waterArea)
          .divide(1000000)
    }
  );
}


// ============================================================
// CALCULATE AREAS
// ============================================================

var area2015 = calculateClassAreas(
  classified2015,
  2015
);

var area2020 = calculateClassAreas(
  classified2020,
  2020
);

var area2025 = calculateClassAreas(
  classified2025,
  2025
);


// ============================================================
// CREATE AREA TABLE
// ============================================================

var areaTable = ee.FeatureCollection([
  area2015,
  area2020,
  area2025
]);


// ============================================================
// PRINT AREA RESULTS
// ============================================================

print(
  '========================================'
);

print(
  'CLASS AREA — km²'
);

print(
  areaTable
    .sort('year')
);


// ============================================================
// PRINT INDIVIDUAL YEARS
// ============================================================

print(
  '2015 AREA:',
  area2015
);

print(
  '2020 AREA:',
  area2020
);

print(
  '2025 AREA:',
  area2025
);


// ============================================================
// STEP 6 COMPLETE
// ============================================================

print(
  '========================================'
);

print(
  'STEP 6 COMPLETE'
);

print(
  'Next: calculate temporal change'
);

print(
  '========================================'
);
print('========================================');
print('ACTUAL CLASS AREAS (km²)');
print('========================================');

print(
  '2015 Snow/Ice km²:',
  area2015.get('snow_ice_km2')
);

print(
  '2015 Rock/Bare km²:',
  area2015.get('rock_bare_km2')
);

print(
  '2015 Water km²:',
  area2015.get('water_km2')
);


print(
  '2020 Snow/Ice km²:',
  area2020.get('snow_ice_km2')
);

print(
  '2020 Rock/Bare km²:',
  area2020.get('rock_bare_km2')
);

print(
  '2020 Water km²:',
  area2020.get('water_km2')
);


print(
  '2025 Snow/Ice km²:',
  area2025.get('snow_ice_km2')
);

print(
  '2025 Rock/Bare km²:',
  area2025.get('rock_bare_km2')
);

print(
  '2025 Water km²:',
  area2025.get('water_km2')
);

print('========================================');
// ============================================================
// HIMALAYAN EYE
// STEP 7 — CRYOSPHERE CHANGE DETECTION
// 2015 → 2025
// ============================================================

// ------------------------------------------------------------
// 1. CREATE TRANSITION IMAGE
// ------------------------------------------------------------

// Class codes:
// 0 = Snow / Ice
// 1 = Rock / Bare land
// 2 = Water

// Transition code = (2015 class × 3) + 2025 class

var transition2015_2025 = classified2015
  .multiply(3)
  .add(classified2025)
  .rename('transition');

// ------------------------------------------------------------
// 2. DEFINE TRANSITION CODES
// ------------------------------------------------------------

// 0 = Snow → Snow
// 1 = Snow → Rock
// 2 = Snow → Water
// 3 = Rock → Snow
// 4 = Rock → Rock
// 5 = Rock → Water
// 6 = Water → Snow
// 7 = Water → Rock
// 8 = Water → Water

print('========================================');
print('STEP 7 — 2015 → 2025 CHANGE DETECTION');
print('========================================');

print('Transition codes:');
print('0 = Snow → Snow');
print('1 = Snow → Rock');
print('2 = Snow → Water');
print('3 = Rock → Snow');
print('4 = Rock → Rock');
print('5 = Rock → Water');
print('6 = Water → Snow');
print('7 = Water → Rock');
print('8 = Water → Water');

// ------------------------------------------------------------
// 3. DISPLAY TRANSITION MAP
// ------------------------------------------------------------

var transitionVis = {
  min: 0,
  max: 8,
  palette: [
    'ffffff', // 0 Snow → Snow
    'ff8800', // 1 Snow → Rock
    'ff0000', // 2 Snow → Water
    '00cc44', // 3 Rock → Snow
    '888888', // 4 Rock → Rock
    'cc00ff', // 5 Rock → Water
    '00ffff', // 6 Water → Snow
    '0066ff', // 7 Water → Rock
    '000066'  // 8 Water → Water
  ]
};

Map.addLayer(
  transition2015_2025,
  transitionVis,
  '2015 → 2025 Transition Map',
  true
);

// ------------------------------------------------------------
// 4. CREATE SNOW / ICE LOSS MAP
// ------------------------------------------------------------

// Snow/Ice in 2015 → anything other than Snow/Ice in 2025

var snowLoss = classified2015
  .eq(0)
  .and(classified2025.neq(0))
  .selfMask();

Map.addLayer(
  snowLoss,
  {palette: ['red']},
  'Snow/Ice Loss — 2015 → 2025',
  false
);

// ------------------------------------------------------------
// 5. CREATE SNOW / ICE GAIN MAP
// ------------------------------------------------------------

// Anything other than Snow/Ice in 2015 → Snow/Ice in 2025

var snowGain = classified2015
  .neq(0)
  .and(classified2025.eq(0))
  .selfMask();

Map.addLayer(
  snowGain,
  {palette: ['cyan']},
  'Snow/Ice Gain — 2015 → 2025',
  false
);

// ------------------------------------------------------------
// 6. CREATE STABLE SNOW / ICE MAP
// ------------------------------------------------------------

var stableSnow = classified2015
  .eq(0)
  .and(classified2025.eq(0))
  .selfMask();

Map.addLayer(
  stableSnow,
  {palette: ['white']},
  'Stable Snow/Ice — 2015 → 2025',
  false
);

// ------------------------------------------------------------
// 7. CALCULATE TRANSITION AREAS
// ------------------------------------------------------------

var pixelArea = ee.Image.pixelArea();

var transitionArea = pixelArea
  .addBands(transition2015_2025)
  .reduceRegion({
    reducer: ee.Reducer.sum().group({
      groupField: 1,
      groupName: 'transition'
    }),
    geometry: roi,
    scale: 30,
    maxPixels: 1e9,
    tileScale: 4
  });

// ------------------------------------------------------------
// 8. CONVERT AREA TO km²
// ------------------------------------------------------------

var transitionGroups = ee.List(
  transitionArea.get('groups')
);

var transitionResults = transitionGroups.map(
  function(item) {

    item = ee.Dictionary(item);

    return ee.Feature(null, {
      transition: item.get('transition'),
      area_km2: ee.Number(
        item.get('sum')
      ).divide(1000000)
    });
  }
);

var transitionTable = ee.FeatureCollection(
  transitionResults
);

// ------------------------------------------------------------
// 9. PRINT RESULTS
// ------------------------------------------------------------

print('========================================');
print('TRANSITION AREAS (km²)');
print('========================================');

print(transitionTable);

// ------------------------------------------------------------
// 10. CALCULATE SNOW LOSS / GAIN AREAS
// ------------------------------------------------------------

var snowLossArea = snowLoss
  .multiply(pixelArea)
  .rename('area')
  .reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: roi,
    scale: 30,
    maxPixels: 1e9,
    tileScale: 4
  });

var snowGainArea = snowGain
  .multiply(pixelArea)
  .rename('area')
  .reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: roi,
    scale: 30,
    maxPixels: 1e9,
    tileScale: 4
  });

print(
  'Snow/Ice loss 2015 → 2025 (km²):',
  ee.Number(snowLossArea.get('area'))
    .divide(1000000)
);

print(
  'Snow/Ice gain 2015 → 2025 (km²):',
  ee.Number(snowGainArea.get('area'))
    .divide(1000000)
);

print('========================================');
print('STEP 7 COMPLETE');
print('========================================');

print('========================================');
print('STEP 7 COMPLETE');
print('========================================');
// ============================================================
// HIMALAYAN EYE
// STEP 8 — SPATIAL BLOCK VALIDATION
// ============================================================

// We use the 2015 image and the same labelled polygons.
// Instead of randomly splitting pixels,
// we divide the study region into spatial blocks.
//
// LEFT side  = training
// RIGHT side = spatially independent validation
//
// This tests whether the model generalizes to a different
// geographic part of the study region.

// ------------------------------------------------------------
// 1. CREATE LEFT / RIGHT SPATIAL BLOCKS
// ------------------------------------------------------------

var roiBounds = roi.bounds();

var coords = ee.List(
  roiBounds.coordinates().get(0)
);

var xmin = ee.Number(
  ee.List(coords.get(0)).get(0)
);

var xmax = ee.Number(
  ee.List(coords.get(2)).get(0)
);

var xmid = xmin.add(xmax).divide(2);

// Left half
var trainingRegion = ee.Geometry.Rectangle([
  xmin,
  32.19,
  xmid,
  32.28
]);

// Right half
var validationRegion = ee.Geometry.Rectangle([
  xmid,
  32.19,
  xmax,
  32.28
]);

Map.addLayer(
  trainingRegion,
  {color: 'blue'},
  'Spatial Training Region',
  false
);

Map.addLayer(
  validationRegion,
  {color: 'red'},
  'Spatial Validation Region',
  false
);

// ------------------------------------------------------------
// 2. GET ALL LABELLED SAMPLES AGAIN
// ------------------------------------------------------------

var spatialSamples = image2015
  .select(bands)
  .sampleRegions({
    collection: trainingPolygons,
    properties: ['class'],
    scale: 30,
    geometries: true,
    tileScale: 4
  });

// ------------------------------------------------------------
// 3. SPLIT SAMPLES BY LOCATION
// ------------------------------------------------------------

// Training samples must fall inside the left region.

var spatialTraining = spatialSamples.filterBounds(
  trainingRegion
);

// Validation samples must fall inside the right region.

var spatialValidation = spatialSamples.filterBounds(
  validationRegion
);

// ------------------------------------------------------------
// 4. CHECK SAMPLE COUNTS
// ------------------------------------------------------------

print('========================================');
print('STEP 8 — SPATIAL VALIDATION');
print('========================================');

print(
  'Total spatial samples:',
  spatialSamples.size()
);

print(
  'Spatial training samples:',
  spatialTraining.size()
);

print(
  'Spatial validation samples:',
  spatialValidation.size()
);

// ------------------------------------------------------------
// 5. CHECK CLASS DISTRIBUTION
// ------------------------------------------------------------

print(
  'Training class distribution:',
  spatialTraining.aggregate_histogram('class')
);

print(
  'Validation class distribution:',
  spatialValidation.aggregate_histogram('class')
);

// ------------------------------------------------------------
// 6. TRAIN RANDOM FOREST
// ------------------------------------------------------------

var spatialClassifier = ee.Classifier.smileRandomForest({
  numberOfTrees: 100,
  seed: 42
}).train({
  features: spatialTraining,
  classProperty: 'class',
  inputProperties: bands
});

// ------------------------------------------------------------
// 7. CLASSIFY SPATIAL VALIDATION DATA
// ------------------------------------------------------------

var spatialValidated = spatialValidation.classify(
  spatialClassifier
);

// ------------------------------------------------------------
// 8. CONFUSION MATRIX
// ------------------------------------------------------------

var spatialMatrix = spatialValidated.errorMatrix(
  'class',
  'classification'
);

print(
  'Spatial validation confusion matrix:',
  spatialMatrix
);

// ------------------------------------------------------------
// 9. ACCURACY
// ------------------------------------------------------------

print(
  'Spatial validation overall accuracy:',
  spatialMatrix.accuracy()
);

print(
  'Spatial validation Kappa:',
  spatialMatrix.kappa()
);

// ------------------------------------------------------------
// 10. FINISH
// ------------------------------------------------------------

print('========================================');
print('STEP 8 COMPLETE');
print('========================================');
// ============================================================
// HIMALAYAN EYE
// STEP 8B — STRATIFIED SPATIAL VALIDATION
// ============================================================

// Goal:
// Test the Random Forest on spatially separated pixels
// while keeping all 3 classes represented.
//
// Class 0 = Snow/Ice
// Class 1 = Rock/Bare
// Class 2 = Water

// ------------------------------------------------------------
// 1. CREATE LABELED SAMPLES
// ------------------------------------------------------------

var spatialSamples2 = image2015
  .select(bands)
  .sampleRegions({
    collection: trainingPolygons,
    properties: ['class'],
    scale: 30,
    geometries: true,
    tileScale: 4
  });

// ------------------------------------------------------------
// 2. ADD PIXEL LOCATION
// ------------------------------------------------------------

var samplesWithXY = spatialSamples2.map(function(feature) {

  var coords = feature.geometry().coordinates();

  return feature.set({
    longitude: coords.get(0),
    latitude: coords.get(1)
  });

});

// ------------------------------------------------------------
// 3. CREATE SPATIAL GRID CELLS
// ------------------------------------------------------------

// We use approximately 300 m spatial blocks.
// Pixels inside the same block stay together.
//
// This prevents nearby pixels from being randomly split
// between training and validation.

var blockSize = 0.003;

// Convert longitude/latitude into block IDs.

var blockedSamples = samplesWithXY.map(function(feature) {

  var lon = ee.Number(feature.get('longitude'));
  var lat = ee.Number(feature.get('latitude'));

  var xBlock = lon
    .divide(blockSize)
    .floor();

  var yBlock = lat
    .divide(blockSize)
    .floor();

  var blockID = xBlock
    .multiply(100000)
    .add(yBlock);

  return feature.set({
    xBlock: xBlock,
    yBlock: yBlock,
    blockID: blockID
  });

});

// ------------------------------------------------------------
// 4. CREATE SPATIAL CHECKERBOARD
// ------------------------------------------------------------

// Blocks are assigned alternately to training and validation.
//
// IMPORTANT:
// Pixels from the same spatial block never appear in both sets.

var checkerboardSamples = blockedSamples.map(function(feature) {

  var x = ee.Number(feature.get('xBlock'));
  var y = ee.Number(feature.get('yBlock'));

  var parity = x.add(y).mod(2);

  return feature.set('spatialSplit', parity);

});

// ------------------------------------------------------------
// 5. SPLIT TRAINING / VALIDATION
// ------------------------------------------------------------

var spatialTraining2 = checkerboardSamples.filter(
  ee.Filter.eq('spatialSplit', 0)
);

var spatialValidation2 = checkerboardSamples.filter(
  ee.Filter.eq('spatialSplit', 1)
);

// ------------------------------------------------------------
// 6. PRINT SAMPLE COUNTS
// ------------------------------------------------------------

print('========================================');
print('STEP 8B — STRATIFIED SPATIAL VALIDATION');
print('========================================');

print(
  'Total samples:',
  checkerboardSamples.size()
);

print(
  'Spatial training samples:',
  spatialTraining2.size()
);

print(
  'Spatial validation samples:',
  spatialValidation2.size()
);

// ------------------------------------------------------------
// 7. CHECK CLASS DISTRIBUTION
// ------------------------------------------------------------

print(
  'Spatial training class distribution:',
  spatialTraining2.aggregate_histogram('class')
);

print(
  'Spatial validation class distribution:',
  spatialValidation2.aggregate_histogram('class')
);

// ------------------------------------------------------------
// 8. TRAIN RANDOM FOREST
// ------------------------------------------------------------

var spatialClassifier2 = ee.Classifier.smileRandomForest({
  numberOfTrees: 100,
  seed: 42
}).train({
  features: spatialTraining2,
  classProperty: 'class',
  inputProperties: bands
});

// ------------------------------------------------------------
// 9. CLASSIFY SPATIALLY SEPARATED VALIDATION SAMPLES
// ------------------------------------------------------------

var spatialValidated2 = spatialValidation2.classify(
  spatialClassifier2
);

// ------------------------------------------------------------
// 10. CONFUSION MATRIX
// ------------------------------------------------------------

var spatialMatrix2 = spatialValidated2.errorMatrix(
  'class',
  'classification'
);

print(
  'Spatial validation confusion matrix:',
  spatialMatrix2
);

// ------------------------------------------------------------
// 11. ACCURACY
// ------------------------------------------------------------

print(
  'Spatial validation overall accuracy:',
  spatialMatrix2.accuracy()
);

print(
  'Spatial validation Kappa:',
  spatialMatrix2.kappa()
);

// ------------------------------------------------------------
// 12. FINISH
// ------------------------------------------------------------

print('========================================');
print('STEP 8B COMPLETE');
print('========================================');
// ============================================================
// HIMALAYAN EYE
// STEP 9 — RANDOM FOREST FEATURE IMPORTANCE
// ============================================================

// We use the classifier trained for the spatial validation.
// This lets us inspect which input features contributed most
// to the Random Forest classification.
//
// Features:
// SR_B2, SR_B3, SR_B4, SR_B5, SR_B6, SR_B7,
// NDSI, NDVI, NDWI

// ------------------------------------------------------------
// 1. GET CLASSIFIER EXPLANATION
// ------------------------------------------------------------

var classifierExplanation = spatialClassifier2.explain();

print('========================================');
print('STEP 9 — FEATURE IMPORTANCE');
print('========================================');

print(
  'Random Forest classifier explanation:',
  classifierExplanation
);

// ------------------------------------------------------------
// 2. EXTRACT FEATURE IMPORTANCE
// ------------------------------------------------------------

var importance = ee.Dictionary(
  classifierExplanation.get('importance')
);

print(
  'Feature importance:',
  importance
);

// ------------------------------------------------------------
// 3. CONVERT TO FEATURE COLLECTION
// ------------------------------------------------------------

var importanceFeatures = ee.FeatureCollection(
  bands.map(function(band) {

    return ee.Feature(null, {
      feature: band,
      importance: importance.get(band)
    });

  })
);

// ------------------------------------------------------------
// 4. PRINT TABLE
// ------------------------------------------------------------

print(
  'Feature importance table:',
  importanceFeatures
);

// ------------------------------------------------------------
// 5. SORT FEATURES BY IMPORTANCE
// ------------------------------------------------------------

var sortedImportance = importanceFeatures.sort(
  'importance',
  false
);

print(
  'Features ranked by importance:',
  sortedImportance
);

// ------------------------------------------------------------
// 6. FINISH
// ------------------------------------------------------------

print('========================================');
print('STEP 9 COMPLETE');
print('========================================');
// ============================================================
// HIMALAYAN EYE
// STEP 10 — NDSI ABLATION EXPERIMENT
// ============================================================

// Goal:
// Test how much the model depends on NDSI.
//
// FULL MODEL:
// B2, B3, B4, B5, B6, B7, NDSI, NDVI, NDWI
//
// NO-NDSI MODEL:
// B2, B3, B4, B5, B6, B7, NDVI, NDWI

// ------------------------------------------------------------
// 1. DEFINE FEATURES WITHOUT NDSI
// ------------------------------------------------------------

var bandsNoNDSI = [
  'SR_B2',
  'SR_B3',
  'SR_B4',
  'SR_B5',
  'SR_B6',
  'SR_B7',
  'NDVI',
  'NDWI'
];

print('========================================');
print('STEP 10 — NDSI ABLATION EXPERIMENT');
print('========================================');

print(
  'Features used without NDSI:',
  bandsNoNDSI
);

// ------------------------------------------------------------
// 2. TRAIN NO-NDSI RANDOM FOREST
// ------------------------------------------------------------

var noNDSIClassifier = ee.Classifier.smileRandomForest({
  numberOfTrees: 100,
  seed: 42
}).train({
  features: spatialTraining2,
  classProperty: 'class',
  inputProperties: bandsNoNDSI
});

// ------------------------------------------------------------
// 3. CLASSIFY SPATIAL VALIDATION SAMPLES
// ------------------------------------------------------------

var noNDSIValidated = spatialValidation2.classify(
  noNDSIClassifier
);

// ------------------------------------------------------------
// 4. CONFUSION MATRIX
// ------------------------------------------------------------

var noNDSIMatrix = noNDSIValidated.errorMatrix(
  'class',
  'classification'
);

print(
  'No-NDSI confusion matrix:',
  noNDSIMatrix
);

// ------------------------------------------------------------
// 5. ACCURACY
// ------------------------------------------------------------

var noNDSIAccuracy = noNDSIMatrix.accuracy();

var noNDSIKappa = noNDSIMatrix.kappa();

print(
  'No-NDSI spatial validation accuracy:',
  noNDSIAccuracy
);

print(
  'No-NDSI spatial validation Kappa:',
  noNDSIKappa
);

// ------------------------------------------------------------
// 6. COMPARE WITH FULL MODEL
// ------------------------------------------------------------

var fullAccuracy = spatialMatrix2.accuracy();

var fullKappa = spatialMatrix2.kappa();

print(
  'Full model spatial validation accuracy:',
  fullAccuracy
);

print(
  'Full model spatial validation Kappa:',
  fullKappa
);

// ------------------------------------------------------------
// 7. CALCULATE PERFORMANCE DIFFERENCE
// ------------------------------------------------------------

var accuracyDifference = fullAccuracy
  .subtract(noNDSIAccuracy);

var kappaDifference = fullKappa
  .subtract(noNDSIKappa);

print(
  'Accuracy difference (Full − No NDSI):',
  accuracyDifference
);

print(
  'Kappa difference (Full − No NDSI):',
  kappaDifference
);

// ------------------------------------------------------------
// 8. FEATURE IMPORTANCE WITHOUT NDSI
// ------------------------------------------------------------

var noNDSIExplanation = noNDSIClassifier.explain();

var noNDSIImportance = ee.Dictionary(
  noNDSIExplanation.get('importance')
);

print(
  'No-NDSI feature importance:',
  noNDSIImportance
);

// ------------------------------------------------------------
// 9. OOB ERROR
// ------------------------------------------------------------

print(
  'No-NDSI OOB error:',
  noNDSIExplanation.get(
    'outOfBagErrorEstimate'
  )
);

// ------------------------------------------------------------
// 10. FINISH
// ------------------------------------------------------------

print('========================================');
print('STEP 10 COMPLETE');
print('========================================');
// ============================================================
// HIMALAYAN EYE
// STEP 11 — CLASS-WISE PERFORMANCE
// ============================================================

// We use the FULL MODEL spatial validation results.
//
// Classes:
// 0 = Snow / Ice
// 1 = Rock / Bare land
// 2 = Water

// ============================================================
// HIMALAYAN EYE
// STEP 11 — CLASS-WISE PERFORMANCE
// SIMPLE + ROBUST VERSION
// ============================================================

// Classes:
// 0 = Snow / Ice
// 1 = Rock / Bare land
// 2 = Water

print('========================================');
print('STEP 11 — CLASS-WISE PERFORMANCE');
print('========================================');


// ------------------------------------------------------------
// 1. CONFUSION MATRIX
// ------------------------------------------------------------

var cm = spatialMatrix2;

print('Full model confusion matrix:', cm);


// ------------------------------------------------------------
// 2. OVERALL PERFORMANCE
// ------------------------------------------------------------

print('Overall accuracy:', cm.accuracy());
print('Kappa:', cm.kappa());


// ------------------------------------------------------------
// 3. PRODUCER ACCURACY
// ------------------------------------------------------------

var producer = cm.producersAccuracy();

print('Producer accuracy:', producer);


// ------------------------------------------------------------
// 4. CONSUMER / USER ACCURACY
// ------------------------------------------------------------

var consumer = cm.consumersAccuracy();

print('Consumer / User accuracy:', consumer);


// ------------------------------------------------------------
// 5. EXPLICIT CLASS-WISE METRICS
// ------------------------------------------------------------

// Confusion matrix:
//
//              Predicted
//             S     R     W
//
// Actual S   406    0     0
// Actual R     0  257    21
// Actual W     0    4    100
//
// We calculate each class directly.

// ---------- SNOW / ICE ----------

var snowTP = 406;
var snowActual = 406;
var snowPredicted = 406;

var snowRecall = snowTP / snowActual;
var snowPrecision = snowTP / snowPredicted;

var snowF1 =
  (2 * snowPrecision * snowRecall) /
  (snowPrecision + snowRecall);


// ---------- ROCK / BARE ----------

var rockTP = 257;
var rockActual = 257 + 21;
var rockPredicted = 257 + 4;

var rockRecall = rockTP / rockActual;
var rockPrecision = rockTP / rockPredicted;

var rockF1 =
  (2 * rockPrecision * rockRecall) /
  (rockPrecision + rockRecall);


// ---------- WATER ----------

var waterTP = 100;
var waterActual = 100 + 4;
var waterPredicted = 100 + 21;

var waterRecall = waterTP / waterActual;
var waterPrecision = waterTP / waterPredicted;

var waterF1 =
  (2 * waterPrecision * waterRecall) /
  (waterPrecision + waterRecall);


// ------------------------------------------------------------
// 6. PRINT RESULTS
// ------------------------------------------------------------

print('----------------------------------------');
print('SNOW / ICE');
print('Precision:', snowPrecision);
print('Recall:', snowRecall);
print('F1:', snowF1);

print('----------------------------------------');
print('ROCK / BARE LAND');
print('Precision:', rockPrecision);
print('Recall:', rockRecall);
print('F1:', rockF1);

print('----------------------------------------');
print('WATER');
print('Precision:', waterPrecision);
print('Recall:', waterRecall);
print('F1:', waterF1);

print('========================================');
print('STEP 11 COMPLETE');
print('========================================');
// ============================================================
// HIMALAYAN EYE
// STEP 12 — TEMPORAL TRANSITION ANALYSIS
// 2015 → 2025
// ============================================================

// Classes:
// 0 = Snow / Ice
// 1 = Rock / Bare land
// 2 = Water

print('========================================');
print('STEP 12 — TEMPORAL TRANSITION ANALYSIS');
print('========================================');


// ------------------------------------------------------------
// 1. CREATE TRANSITION IMAGE
// ------------------------------------------------------------

// Formula:
// transition = 2015 class × 3 + 2025 class
//
// This gives:
//
// 0 = Snow  → Snow
// 1 = Snow  → Rock
// 2 = Snow  → Water
//
// 3 = Rock  → Snow
// 4 = Rock  → Rock
// 5 = Rock  → Water
//
// 6 = Water → Snow
// 7 = Water → Rock
// 8 = Water → Water

var transition2015_2025 = classified2015
  .multiply(3)
  .add(classified2025)
  .rename('transition');


// ------------------------------------------------------------
// 2. DISPLAY TRANSITION MAP
// ------------------------------------------------------------

var transitionVis = {
  min: 0,
  max: 8,
  palette: [
    'ffffff', // 0 Snow → Snow
    'ff9900', // 1 Snow → Rock
    'ff0000', // 2 Snow → Water
    '00ff00', // 3 Rock → Snow
    '999999', // 4 Rock → Rock
    '0000ff', // 5 Rock → Water
    '00ffff', // 6 Water → Snow
    '800080', // 7 Water → Rock
    '000000'  // 8 Water → Water
  ]
};

Map.addLayer(
  transition2015_2025,
  transitionVis,
  '2015 → 2025 Transitions',
  false
);


// ------------------------------------------------------------
// 3. PIXEL AREA
// ------------------------------------------------------------

var pixelArea = ee.Image.pixelArea()
  .rename('area');


// ------------------------------------------------------------
// 4. CALCULATE AREA FOR EACH TRANSITION
// ------------------------------------------------------------

var transitionCodes = ee.List.sequence(0, 8);

var transitionAreas = transitionCodes.map(function(code) {

  code = ee.Number(code);

  var area = pixelArea
    .updateMask(
      transition2015_2025.eq(code)
    )
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: roi,
      scale: 30,
      maxPixels: 1e9,
      tileScale: 4
    })
    .get('area');

  return ee.Number(area).divide(1e6);
});


// ------------------------------------------------------------
// 5. PRINT TRANSITION AREAS
// ------------------------------------------------------------

print(
  'Transition areas (km²), codes 0–8:',
  transitionAreas
);


// ------------------------------------------------------------
// 6. LABEL EACH TRANSITION
// ------------------------------------------------------------

var transitionNames = ee.List([
  'Snow/Ice → Snow/Ice',
  'Snow/Ice → Rock/Bare',
  'Snow/Ice → Water',
  'Rock/Bare → Snow/Ice',
  'Rock/Bare → Rock/Bare',
  'Rock/Bare → Water',
  'Water → Snow/Ice',
  'Water → Rock/Bare',
  'Water → Water'
]);


// ------------------------------------------------------------
// 7. CREATE READABLE TABLE
// ------------------------------------------------------------

var transitionTable = ee.FeatureCollection(
  transitionCodes.map(function(code) {

    code = ee.Number(code);
    var index = code.int();

    return ee.Feature(null, {
      code: code,
      transition: transitionNames.get(index),
      area_km2: transitionAreas.get(index)
    });

  })
);

print(
  'Transition table:',
  transitionTable
);


// ------------------------------------------------------------
// 8. SNOW LOSS
// ------------------------------------------------------------

// Snow/Ice in 2015
// AND
// NOT Snow/Ice in 2025

var snowLoss = classified2015.eq(0)
  .and(classified2025.neq(0));

var snowLossArea = pixelArea
  .updateMask(snowLoss)
  .reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: roi,
    scale: 30,
    maxPixels: 1e9,
    tileScale: 4
  })
  .get('area');


// ------------------------------------------------------------
// 9. SNOW GAIN
// ------------------------------------------------------------

// NOT Snow/Ice in 2015
// AND
// Snow/Ice in 2025

var snowGain = classified2015.neq(0)
  .and(classified2025.eq(0));

var snowGainArea = pixelArea
  .updateMask(snowGain)
  .reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: roi,
    scale: 30,
    maxPixels: 1e9,
    tileScale: 4
  })
  .get('area');


// ------------------------------------------------------------
// 10. PRINT SNOW LOSS / GAIN
// ------------------------------------------------------------

print(
  'Snow/Ice loss 2015 → 2025 (km²):',
  ee.Number(snowLossArea).divide(1e6)
);

print(
  'Snow/Ice gain 2015 → 2025 (km²):',
  ee.Number(snowGainArea).divide(1e6)
);


print('========================================');
print('STEP 12 COMPLETE');
print('========================================');
// ============================================================
// HIMALAYAN EYE
// STEP 13 — TEMPORAL CONSISTENCY AUDIT
// ============================================================

print('========================================');
print('STEP 13 — TEMPORAL CONSISTENCY AUDIT');
print('========================================');


// ------------------------------------------------------------
// 1. CREATE COMMON VALID PIXEL MASK
// ------------------------------------------------------------

// A pixel is included only if BOTH classified images
// contain a valid classification.

var commonMask = classified2015.mask()
  .and(classified2025.mask());


// ------------------------------------------------------------
// 2. APPLY COMMON MASK
// ------------------------------------------------------------

var common2015 = classified2015
  .updateMask(commonMask);

var common2025 = classified2025
  .updateMask(commonMask);


// ------------------------------------------------------------
// 3. CALCULATE 2015 AREAS ON COMMON PIXELS
// ------------------------------------------------------------

var areaImage2015 = ee.Image.pixelArea()
  .rename('area');

var area2015Common = ee.List.sequence(0, 2).map(function(classValue) {

  classValue = ee.Number(classValue);

  var area = areaImage2015
    .updateMask(common2015.eq(classValue))
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: roi,
      scale: 30,
      maxPixels: 1e9,
      tileScale: 4
    })
    .get('area');

  return ee.Number(area).divide(1e6);
});


// ------------------------------------------------------------
// 4. CALCULATE 2025 AREAS ON COMMON PIXELS
// ------------------------------------------------------------

var area2025Common = ee.List.sequence(0, 2).map(function(classValue) {

  classValue = ee.Number(classValue);

  var area = areaImage2015
    .updateMask(common2025.eq(classValue))
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: roi,
      scale: 30,
      maxPixels: 1e9,
      tileScale: 4
    })
    .get('area');

  return ee.Number(area).divide(1e6);
});


// ------------------------------------------------------------
// 5. PRINT COMMON-PIXEL CLASS AREAS
// ------------------------------------------------------------

print(
  '2015 class areas on COMMON valid pixels (km²):',
  area2015Common
);

print(
  '2025 class areas on COMMON valid pixels (km²):',
  area2025Common
);


// ------------------------------------------------------------
// 6. RE-CALCULATE TRANSITION TOTAL
// ------------------------------------------------------------

var transitionCommon = common2015
  .multiply(3)
  .add(common2025)
  .rename('transition');

var transitionTotal = ee.Image.pixelArea()
  .updateMask(transitionCommon.mask())
  .reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: roi,
    scale: 30,
    maxPixels: 1e9,
    tileScale: 4
  })
  .get('area');

print(
  'Total COMMON valid area (km²):',
  ee.Number(transitionTotal).divide(1e6)
);


// ------------------------------------------------------------
// 7. SUM COMMON CLASS AREAS
// ------------------------------------------------------------

var total2015Common = ee.Number(
  area2015Common.get(0)
)
.add(area2015Common.get(1))
.add(area2015Common.get(2));

var total2025Common = ee.Number(
  area2025Common.get(0)
)
.add(area2025Common.get(1))
.add(area2025Common.get(2));

print(
  'Sum of 2015 common-pixel classes (km²):',
  total2015Common
);

print(
  'Sum of 2025 common-pixel classes (km²):',
  total2025Common
);


// ------------------------------------------------------------
// 8. DIFFERENCE BETWEEN COMMON-YEAR TOTALS
// ------------------------------------------------------------

print(
  '2015 common total − transition total:',
  total2015Common
    .subtract(
      ee.Number(transitionTotal).divide(1e6)
    )
);

print(
  '2025 common total − transition total:',
  total2025Common
    .subtract(
      ee.Number(transitionTotal).divide(1e6)
    )
);


// ------------------------------------------------------------
// 9. FINAL CHECK
// ------------------------------------------------------------

print('========================================');
print('STEP 13 COMPLETE');
print('If the differences are approximately 0,');
print('the transition analysis is internally consistent.');
print('========================================');
// ============================================================
// HIMALAYAN EYE
// STEP 14 — COMMON-PIXEL TRANSITION MATRIX
// 2015 → 2025
// ============================================================

// Classes:
// 0 = Snow / Ice
// 1 = Rock / Bare land
// 2 = Water
//
// Only pixels valid in BOTH 2015 and 2025 are included.

print('========================================');
print('STEP 14 — COMMON-PIXEL TRANSITION MATRIX');
print('========================================');


// ------------------------------------------------------------
// 1. COMMON VALID PIXELS
// ------------------------------------------------------------

var commonMask = classified2015.mask()
  .and(classified2025.mask());

var common2015 = classified2015
  .updateMask(commonMask);

var common2025 = classified2025
  .updateMask(commonMask);


// ------------------------------------------------------------
// 2. TRANSITION IMAGE
// ------------------------------------------------------------

var commonTransition = common2015
  .multiply(3)
  .add(common2025)
  .rename('transition');


// ------------------------------------------------------------
// 3. PIXEL AREA
// ------------------------------------------------------------

var areaImage = ee.Image.pixelArea()
  .rename('area');


// ------------------------------------------------------------
// 4. CALCULATE EACH TRANSITION
// ------------------------------------------------------------

var transitionCodes = ee.List.sequence(0, 8);

var transitionAreas = transitionCodes.map(function(code) {

  code = ee.Number(code);

  var area = areaImage
    .updateMask(
      commonTransition.eq(code)
    )
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: roi,
      scale: 30,
      maxPixels: 1e9,
      tileScale: 4
    })
    .get('area');

  return ee.Number(area).divide(1e6);
});


// ------------------------------------------------------------
// 5. LABELS
// ------------------------------------------------------------

var transitionNames = ee.List([
  'Snow/Ice → Snow/Ice',
  'Snow/Ice → Rock/Bare',
  'Snow/Ice → Water',
  'Rock/Bare → Snow/Ice',
  'Rock/Bare → Rock/Bare',
  'Rock/Bare → Water',
  'Water → Snow/Ice',
  'Water → Rock/Bare',
  'Water → Water'
]);


// ------------------------------------------------------------
// 6. CREATE FINAL TRANSITION TABLE
// ------------------------------------------------------------

var finalTransitionTable = ee.FeatureCollection(
  transitionCodes.map(function(code) {

    code = ee.Number(code);

    return ee.Feature(null, {
      code: code,
      transition: transitionNames.get(code.int()),
      area_km2: transitionAreas.get(code.int())
    });

  })
);

print(
  'FINAL COMMON-PIXEL TRANSITION TABLE:',
  finalTransitionTable
);


// ------------------------------------------------------------
// 7. CREATE 3 × 3 TRANSITION MATRIX
// ------------------------------------------------------------

// Rows = 2015 class
// Columns = 2025 class
//
//             2025
//          S       R       W
// 2015 S  S→S     S→R     S→W
//      R  R→S     R→R     R→W
//      W  W→S     W→R     W→W

var transitionMatrix = ee.Array([
  [
    transitionAreas.get(0),
    transitionAreas.get(1),
    transitionAreas.get(2)
  ],
  [
    transitionAreas.get(3),
    transitionAreas.get(4),
    transitionAreas.get(5)
  ],
  [
    transitionAreas.get(6),
    transitionAreas.get(7),
    transitionAreas.get(8)
  ]
]);

print(
  '3 × 3 transition matrix (km²):',
  transitionMatrix
);


// ------------------------------------------------------------
// 8. SNOW / ICE LOSS
// ------------------------------------------------------------

var snowLoss = ee.Number(
  transitionAreas.get(1)
).add(
  transitionAreas.get(2)
);

print(
  'Total Snow/Ice loss (km²):',
  snowLoss
);


// ------------------------------------------------------------
// 9. SNOW / ICE GAIN
// ------------------------------------------------------------

var snowGain = ee.Number(
  transitionAreas.get(3)
).add(
  transitionAreas.get(6)
);

print(
  'Total Snow/Ice gain (km²):',
  snowGain
);


// ------------------------------------------------------------
// 10. NET SNOW / ICE CHANGE
// ------------------------------------------------------------

print(
  'Net Snow/Ice change (km²):',
  snowGain.subtract(snowLoss)
);


// ------------------------------------------------------------
// 11. PERCENTAGE OF COMMON STUDY AREA
// ------------------------------------------------------------

var commonArea = ee.Number(47.559895711483136);

print(
  'Snow/Ice loss (% of common area):',
  snowLoss
    .divide(commonArea)
    .multiply(100)
);

print(
  'Snow/Ice gain (% of common area):',
  snowGain
    .divide(commonArea)
    .multiply(100
  )
);

print(
  'Net Snow/Ice change (% of common area):',
  snowGain
    .subtract(snowLoss)
    .divide(commonArea)
    .multiply(100)
);


// ------------------------------------------------------------
// 12. FINAL CHECK
// ------------------------------------------------------------

var totalTransitionArea = transitionAreas
  .reduce(ee.Reducer.sum());

print(
  'Total transition area (km²):',
  totalTransitionArea
);

print(
  'Expected common area (km²):',
  commonArea
);

print('========================================');
print('STEP 14 COMPLETE');
print('========================================');
// ============================================================
// STEP 14B — PRINT TRANSITION VALUES EXPLICITLY
// ============================================================

print('----------------------------------------');
print('TRANSITION VALUES — km²');
print('----------------------------------------');

print('Snow/Ice → Snow/Ice:', transitionAreas.get(0));
print('Snow/Ice → Rock/Bare:', transitionAreas.get(1));
print('Snow/Ice → Water:', transitionAreas.get(2));

print('Rock/Bare → Snow/Ice:', transitionAreas.get(3));
print('Rock/Bare → Rock/Bare:', transitionAreas.get(4));
print('Rock/Bare → Water:', transitionAreas.get(5));

print('Water → Snow/Ice:', transitionAreas.get(6));
print('Water → Rock/Bare:', transitionAreas.get(7));
print('Water → Water:', transitionAreas.get(8));

print('----------------------------------------');
// ============================================================
// HIMALAYAN EYE
// STEP 15 — ROW-WISE TRANSITION PERCENTAGES
// ============================================================

print('========================================');
print('STEP 15 — TRANSITION PERCENTAGES');
print('========================================');

// Transition areas from Step 14
var s2s = ee.Number(transitionAreas.get(0)); // Snow → Snow
var s2r = ee.Number(transitionAreas.get(1)); // Snow → Rock
var s2w = ee.Number(transitionAreas.get(2)); // Snow → Water

var r2s = ee.Number(transitionAreas.get(3)); // Rock → Snow
var r2r = ee.Number(transitionAreas.get(4)); // Rock → Rock
var r2w = ee.Number(transitionAreas.get(5)); // Rock → Water

var w2s = ee.Number(transitionAreas.get(6)); // Water → Snow
var w2r = ee.Number(transitionAreas.get(7)); // Water → Rock
var w2w = ee.Number(transitionAreas.get(8)); // Water → Water


// ------------------------------------------------------------
// 2015 CLASS TOTALS
// ------------------------------------------------------------

var snow2015 = s2s.add(s2r).add(s2w);
var rock2015 = r2s.add(r2r).add(r2w);
var water2015 = w2s.add(w2r).add(w2w);


// ------------------------------------------------------------
// SNOW / ICE — 2015 → 2025
// ------------------------------------------------------------

var snowToSnowPct = s2s.divide(snow2015).multiply(100);
var snowToRockPct = s2r.divide(snow2015).multiply(100);
var snowToWaterPct = s2w.divide(snow2015).multiply(100);

print('----------------------------------------');
print('2015 SNOW/ICE');
print('Total area:', snow2015);
print('Stayed Snow/Ice (%):', snowToSnowPct);
print('Changed to Rock/Bare (%):', snowToRockPct);
print('Changed to Water (%):', snowToWaterPct);


// ------------------------------------------------------------
// ROCK / BARE — 2015 → 2025
// ------------------------------------------------------------

var rockToSnowPct = r2s.divide(rock2015).multiply(100);
var rockToRockPct = r2r.divide(rock2015).multiply(100);
var rockToWaterPct = r2w.divide(rock2015).multiply(100);

print('----------------------------------------');
print('2015 ROCK/BARE');
print('Total area:', rock2015);
print('Changed to Snow/Ice (%):', rockToSnowPct);
print('Stayed Rock/Bare (%):', rockToRockPct);
print('Changed to Water (%):', rockToWaterPct);


// ------------------------------------------------------------
// WATER — 2015 → 2025
// ------------------------------------------------------------

var waterToSnowPct = w2s.divide(water2015).multiply(100);
var waterToRockPct = w2r.divide(water2015).multiply(100);
var waterToWaterPct = w2w.divide(water2015).multiply(100);

print('----------------------------------------');
print('2015 WATER');
print('Total area:', water2015);
print('Changed to Snow/Ice (%):', waterToSnowPct);
print('Changed to Rock/Bare (%):', waterToRockPct);
print('Stayed Water (%):', waterToWaterPct);


// ------------------------------------------------------------
// CHECK — EACH ROW SHOULD SUM TO ~100%
// ------------------------------------------------------------

print('----------------------------------------');
print('ROW CHECKS');

print(
  'Snow/Ice row total (%):',
  snowToSnowPct
    .add(snowToRockPct)
    .add(snowToWaterPct)
);

print(
  'Rock/Bare row total (%):',
  rockToSnowPct
    .add(rockToRockPct)
    .add(rockToWaterPct)
);

print(
  'Water row total (%):',
  waterToSnowPct
    .add(waterToRockPct)
    .add(waterToWaterPct)
);

print('========================================');
print('STEP 15 COMPLETE');
print('========================================');
// ============================================================
// HIMALAYAN EYE
// STEP 16 — SNOW/ICE CHANGE MAP
// ============================================================

print('========================================');
print('STEP 16 — SNOW/ICE CHANGE MAP');
print('========================================');


// ------------------------------------------------------------
// COMMON VALID PIXELS
// ------------------------------------------------------------

var commonMask16 = classified2015.mask()
  .and(classified2025.mask());


// ------------------------------------------------------------
// SNOW / ICE MASKS
// Class 0 = Snow/Ice
// ------------------------------------------------------------

var snow2015Mask = classified2015.eq(0)
  .updateMask(commonMask16);

var snow2025Mask = classified2025.eq(0)
  .updateMask(commonMask16);


// ------------------------------------------------------------
// CHANGE CATEGORIES
// ------------------------------------------------------------

// Snow/Ice in 2015 but NOT in 2025
var snowLoss = snow2015Mask
  .and(classified2025.neq(0))
  .selfMask();

// NOT Snow/Ice in 2015 but Snow/Ice in 2025
var snowGain = classified2015.neq(0)
  .and(snow2025Mask)
  .selfMask();

// Snow/Ice in both years
var stableSnow = snow2015Mask
  .and(snow2025Mask)
  .selfMask();


// ------------------------------------------------------------
// DISPLAY
// ------------------------------------------------------------

Map.addLayer(
  stableSnow,
  {palette: ['white']},
  'Stable Snow/Ice — 2015 to 2025',
  true
);

Map.addLayer(
  snowLoss,
  {palette: ['red']},
  'Snow/Ice Loss — 2015 to 2025',
  true
);

Map.addLayer(
  snowGain,
  {palette: ['blue']},
  'Snow/Ice Gain — 2015 to 2025',
  true
);


// ------------------------------------------------------------
// AREA CALCULATION
// ------------------------------------------------------------

var pixelArea16 = ee.Image.pixelArea()
  .divide(1000000)
  .rename('area');

function calculateArea16(mask) {

  return pixelArea16
    .updateMask(mask)
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: roi,
      scale: 30,
      maxPixels: 1e10,
      tileScale: 4
    })
    .get('area');
}


var stableSnowArea16 = calculateArea16(stableSnow);
var snowLossArea16 = calculateArea16(snowLoss);
var snowGainArea16 = calculateArea16(snowGain);


// ------------------------------------------------------------
// PRINT RESULTS
// ------------------------------------------------------------

print('----------------------------------------');

print(
  'Stable Snow/Ice area (km²):',
  stableSnowArea16
);

print(
  'Snow/Ice loss area (km²):',
  snowLossArea16
);

print(
  'Snow/Ice gain area (km²):',
  snowGainArea16
);

print('----------------------------------------');

print(
  'Net Snow/Ice change (km²):',
  ee.Number(snowGainArea16)
    .subtract(ee.Number(snowLossArea16))
);

print('========================================');
print('STEP 16 COMPLETE');
print('========================================');
// ============================================================
// HIMALAYAN EYE
// STEP 17 — FINAL SNOW/ICE CHANGE MAP
// ============================================================

print('========================================');
print('STEP 17 — FINAL CHANGE MAP');
print('========================================');


// ------------------------------------------------------------
// COMMON VALID PIXELS
// ------------------------------------------------------------

var commonMask17 = classified2015.mask()
  .and(classified2025.mask());


// ------------------------------------------------------------
// CREATE CHANGE CLASSES
//
// 0 = No Snow/Ice
// 1 = Stable Snow/Ice
// 2 = Snow/Ice Loss
// 3 = Snow/Ice Gain
// ------------------------------------------------------------

var changeMap17 = ee.Image(0)
  .where(
    classified2015.eq(0)
      .and(classified2025.eq(0)),
    1
  )
  .where(
    classified2015.eq(0)
      .and(classified2025.neq(0)),
    2
  )
  .where(
    classified2015.neq(0)
      .and(classified2025.eq(0)),
    3
  )
  .updateMask(commonMask17);


// ------------------------------------------------------------
// DISPLAY
// ------------------------------------------------------------

var changeVis17 = {
  min: 0,
  max: 3,
  palette: [
    'lightgray',  // 0 = No Snow/Ice
    'white',      // 1 = Stable Snow/Ice
    'red',        // 2 = Snow/Ice Loss
    'blue'        // 3 = Snow/Ice Gain
  ]
};

Map.addLayer(
  changeMap17,
  changeVis17,
  'FINAL — Snow/Ice Change Map',
  true
);


// ------------------------------------------------------------
// AREA BY CHANGE CLASS
// ------------------------------------------------------------

var areaImage17 = ee.Image.pixelArea()
  .divide(1000000)
  .rename('area');

var changeArea17 = areaImage17
  .addBands(changeMap17.rename('change'))
  .reduceRegion({
    reducer: ee.Reducer.sum().group({
      groupField: 1,
      groupName: 'change'
    }),
    geometry: roi,
    scale: 30,
    maxPixels: 1e10,
    tileScale: 4
  });

print('----------------------------------------');
print('FINAL CHANGE MAP AREA TABLE');
print('----------------------------------------');

print(changeArea17);


// ------------------------------------------------------------
// PRINT EXPECTED KEY VALUES
// ------------------------------------------------------------

print('----------------------------------------');
print('KEY RESULTS');

print(
  'Stable Snow/Ice (km²):',
  25.72127216243896
);

print(
  'Snow/Ice Loss (km²):',
  1.5268726765163054
);

print(
  'Snow/Ice Gain (km²):',
  5.501342783623674
);

print(
  'Net Snow/Ice Change (km²):',
  3.9744701071073685
);

print('========================================');
print('STEP 17 COMPLETE');
print('========================================');
// ============================================================
// HIMALAYAN EYE
// STEP 18A — SENTINEL-2 HIGH-RESOLUTION REFERENCE
// ============================================================

print('========================================');
print('STEP 18A — SENTINEL-2');
print('========================================');


// ------------------------------------------------------------
// ROI
// ------------------------------------------------------------

var roi18 = roi;


// ------------------------------------------------------------
// SENTINEL-2 CLOUD MASK
// ------------------------------------------------------------

function maskSentinel2(image) {

  var qa = image.select('QA60');

  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;

  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
    .and(
      qa.bitwiseAnd(cirrusBitMask).eq(0)
    );

  return image
    .updateMask(mask)
    .divide(10000)
    .copyProperties(
      image,
      ['system:time_start']
    );
}


// ------------------------------------------------------------
// SENTINEL-2 COLLECTION
// ------------------------------------------------------------

var sentinel2025 = ee.ImageCollection(
  'COPERNICUS/S2_SR_HARMONIZED'
)
.filterBounds(roi18)
.filterDate(
  '2025-06-01',
  '2025-10-01'
)
.filter(
  ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30)
)
.map(maskSentinel2);


// ------------------------------------------------------------
// MEDIAN COMPOSITE
// ------------------------------------------------------------

var sentinelComposite2025 =
  sentinel2025
    .median()
    .clip(roi18);


// ------------------------------------------------------------
// NDSI
//
// Sentinel-2:
// B3 = Green
// B11 = SWIR
// ------------------------------------------------------------

var sentinelNDSI =
  sentinelComposite2025
    .normalizedDifference([
      'B3',
      'B11'
    ])
    .rename('NDSI');


// ------------------------------------------------------------
// DISPLAY
// ------------------------------------------------------------

var sentinelRGB = {
  bands: [
    'B4',
    'B3',
    'B2'
  ],
  min: 0.02,
  max: 0.30
};

Map.addLayer(
  sentinelComposite2025,
  sentinelRGB,
  'Sentinel-2 RGB — 2025',
  false
);


var sentinelNDSIVis = {
  min: -0.5,
  max: 1,
  palette: [
    'brown',
    'yellow',
    'white'
  ]
};

Map.addLayer(
  sentinelNDSI,
  sentinelNDSIVis,
  'Sentinel-2 NDSI — 2025',
  false
);


// ------------------------------------------------------------
// INFORMATION
// ------------------------------------------------------------

print(
  'Sentinel-2 image count:',
  sentinel2025.size()
);

print(
  'Sentinel-2 bands:',
  sentinelComposite2025.bandNames()
);

print('========================================');
print('STEP 18A COMPLETE');
print('========================================');
// ============================================================
// HIMALAYAN EYE
// STEP 18B — LANDSAT vs SENTINEL-2 CONSISTENCY CHECK
// FIXED PROJECTION VERSION
// ============================================================

print('========================================');
print('STEP 18B — CROSS-SENSOR CONSISTENCY');
print('========================================');


// ------------------------------------------------------------
// 1. SENTINEL-2 NDSI
// ------------------------------------------------------------

var sentinelNDSI18 =
  sentinelComposite2025
    .normalizedDifference([
      'B3',
      'B11'
    ])
    .rename('NDSI');


// ------------------------------------------------------------
// 2. SENTINEL-2 SNOW/ICE REFERENCE
//
// NDSI >= 0.4 is used as a reference threshold,
// NOT as independent ground truth.
// ------------------------------------------------------------

var sentinelSnowReference =
  sentinelNDSI18
    .gte(0.4)
    .rename('sentinelSnow');


// ------------------------------------------------------------
// 3. SET A VALID 10 m DEFAULT PROJECTION
// ------------------------------------------------------------

var sentinelProjection =
  sentinelComposite2025
    .select('B3')
    .projection();


// ------------------------------------------------------------
// 4. APPLY THE PROJECTION TO SENTINEL SNOW MAP
// ------------------------------------------------------------

var sentinelSnowProjected =
  sentinelSnowReference
    .setDefaultProjection({
      crs: sentinelProjection.crs(),
      scale: 10
    })
    .rename('sentinelSnow');


// ------------------------------------------------------------
// 5. LANDSAT RANDOM FOREST SNOW/ICE MAP
//
// class 0 = Snow/Ice
// class 1 = Rock/Bare
// class 2 = Water
// ------------------------------------------------------------

var landsatSnow2025 =
  classified2025
    .eq(0)
    .rename('landsatSnow');


// ------------------------------------------------------------
// 6. COMMON VALID MASK
// ------------------------------------------------------------

var comparisonMask =
  landsatSnow2025
    .mask()
    .and(
      sentinelSnowProjected.mask()
    );


// ------------------------------------------------------------
// 7. AGGREGATE SENTINEL-2 10 m → LANDSAT 30 m
//
// Mean gives the fraction of 10 m pixels classified
// as Snow/Ice within each 30 m Landsat pixel.
// ------------------------------------------------------------

var sentinelSnowFraction30m =
  sentinelSnowProjected
    .reduceResolution({
      reducer: ee.Reducer.mean(),
      maxPixels: 9
    })
    .reproject({
      crs: classified2025.projection(),
      scale: 30
    })
    .rename('sentinelSnowFraction');


// ------------------------------------------------------------
// 8. CREATE 30 m SENTINEL REFERENCE
//
// >= 50% Snow/Ice inside a 30 m pixel
// = Snow/Ice reference.
// ------------------------------------------------------------

var sentinelSnow30m =
  sentinelSnowFraction30m
    .gte(0.5)
    .rename('sentinelSnow30m');


// ------------------------------------------------------------
// 9. AGREEMENT MAP
//
// 1 = Agreement
// 0 = Disagreement
// ------------------------------------------------------------

var agreement =
  landsatSnow2025
    .eq(sentinelSnow30m)
    .updateMask(comparisonMask)
    .rename('agreement');


// ------------------------------------------------------------
// 10. DISPLAY SENTINEL SNOW REFERENCE
// ------------------------------------------------------------

Map.addLayer(
  sentinelSnowProjected,
  {
    min: 0,
    max: 1,
    palette: ['black', 'cyan']
  },
  'Sentinel-2 Snow/Ice Reference — 2025',
  false
);


// ------------------------------------------------------------
// 11. DISPLAY AGREEMENT
// ------------------------------------------------------------

Map.addLayer(
  agreement,
  {
    min: 0,
    max: 1,
    palette: ['red', 'green']
  },
  'Landsat vs Sentinel-2 Agreement — 2025',
  false
);


// ------------------------------------------------------------
// 12. AREA IMAGE
// ------------------------------------------------------------

var areaImage =
  ee.Image.pixelArea()
    .divide(1e6)
    .updateMask(comparisonMask)
    .rename('area');


// ------------------------------------------------------------
// 13. AGREEMENT AREA
// ------------------------------------------------------------

var agreementAreaImage =
  areaImage
    .updateMask(
      agreement.eq(1)
    )
    .rename('area');


// ------------------------------------------------------------
// 14. DISAGREEMENT AREA
// ------------------------------------------------------------

var disagreementAreaImage =
  areaImage
    .updateMask(
      agreement.eq(0)
    )
    .rename('area');


// ------------------------------------------------------------
// 15. REDUCE AREAS
// ------------------------------------------------------------

var comparisonAreaResult =
  areaImage.reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: roi,
    scale: 30,
    maxPixels: 1e9
  });


var agreementAreaResult =
  agreementAreaImage.reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: roi,
    scale: 30,
    maxPixels: 1e9
  });


var disagreementAreaResult =
  disagreementAreaImage.reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: roi,
    scale: 30,
    maxPixels: 1e9
  });


// ------------------------------------------------------------
// 16. PRINT AREAS
// ------------------------------------------------------------

print(
  'Cross-sensor comparison area (km²):',
  comparisonAreaResult
);

print(
  'Agreement area (km²):',
  agreementAreaResult
);

print(
  'Disagreement area (km²):',
  disagreementAreaResult
);


// ------------------------------------------------------------
// 17. AGREEMENT PERCENTAGE
// ------------------------------------------------------------

var agreementPercentage =
  ee.Number(
    agreementAreaResult.get('area')
  )
  .divide(
    ee.Number(
      comparisonAreaResult.get('area')
    )
  )
  .multiply(100);


print(
  'Landsat–Sentinel-2 agreement (%):',
  agreementPercentage
);


// ------------------------------------------------------------
// 18. COMPLETE
// ------------------------------------------------------------

print('========================================');
print('STEP 18B COMPLETE');
print('========================================');
// ============================================================
// HIMALAYAN EYE
// STEP 18C — CROSS-SENSOR CONFUSION MATRIX
// FIXED VERSION
// ============================================================

print('========================================');
print('STEP 18C — CROSS-SENSOR CONFUSION');
print('================================');


// ------------------------------------------------------------
// 1. TWO-CLASS MAPS
//
// 0 = Non-Snow/Ice
// 1 = Snow/Ice
// ------------------------------------------------------------

var landsatSnowClass =
  landsatSnow2025
    .rename('landsat');

var sentinelSnowClass =
  sentinelSnow30m
    .rename('sentinel');


// ------------------------------------------------------------
// 2. COMBINE BOTH CLASSIFICATIONS
//
// Code:
//
// 0 = Landsat Non-Snow → Sentinel Non-Snow
// 1 = Landsat Non-Snow → Sentinel Snow
// 2 = Landsat Snow → Sentinel Non-Snow
// 3 = Landsat Snow → Sentinel Snow
// ------------------------------------------------------------

var crossSensorTransition =
  landsatSnowClass
    .multiply(2)
    .add(sentinelSnowClass)
    .updateMask(comparisonMask)
    .rename('transition');


// ------------------------------------------------------------
// 3. PIXEL AREA
// ------------------------------------------------------------

var transitionArea =
  ee.Image.pixelArea()
    .divide(1e6)
    .updateMask(comparisonMask)
    .addBands(crossSensorTransition);


// ------------------------------------------------------------
// 4. GROUPED AREA
// ------------------------------------------------------------

var transitionStats =
  transitionArea.reduceRegion({
    reducer: ee.Reducer.sum().group({
      groupField: 1,
      groupName: 'transition'
    }),
    geometry: roi,
    scale: 30,
    maxPixels: 1e9
  });


// ------------------------------------------------------------
// 5. PRINT RAW TABLE
// ------------------------------------------------------------

print(
  'Cross-sensor transition areas (km²):',
  transitionStats
);


// ------------------------------------------------------------
// 6. CONVERT GROUPS TO DICTIONARY
//
// Instead of filtering an ee.List,
// we directly build a dictionary from
// the grouped results.
// ------------------------------------------------------------

var transitionGroups =
  ee.List(
    transitionStats.get('groups')
  );


// ------------------------------------------------------------
// 7. CREATE DICTIONARY
// ------------------------------------------------------------

var transitionDictionary =
  ee.Dictionary(
    transitionGroups.iterate(
      function(item, dictionary) {

        item = ee.Dictionary(item);

        var code =
          ee.Number(
            item.get('transition')
          ).format();

        var area =
          item.get('sum');

        return ee.Dictionary(dictionary)
          .set(code, area);
      },
      ee.Dictionary({})
    )
  );


// ------------------------------------------------------------
// 8. EXTRACT AREAS
// ------------------------------------------------------------

var nonSnow_nonSnow =
  ee.Number(
    transitionDictionary.get('0', 0)
  );

var nonSnow_snow =
  ee.Number(
    transitionDictionary.get('1', 0)
  );

var snow_nonSnow =
  ee.Number(
    transitionDictionary.get('2', 0)
  );

var snow_snow =
  ee.Number(
    transitionDictionary.get('3', 0)
  );


// ------------------------------------------------------------
// 9. PRINT AREAS
// ------------------------------------------------------------

print(
  'Landsat Non-Snow → Sentinel Non-Snow (km²):',
  nonSnow_nonSnow
);

print(
  'Landsat Non-Snow → Sentinel Snow (km²):',
  nonSnow_snow
);

print(
  'Landsat Snow → Sentinel Non-Snow (km²):',
  snow_nonSnow
);

print(
  'Landsat Snow → Sentinel Snow (km²):',
  snow_snow
);


// ------------------------------------------------------------
// 10. TOTAL COMPARISON AREA
// ------------------------------------------------------------

var totalComparisonArea =
  ee.Number(
    comparisonAreaResult.get('area')
  );


// ------------------------------------------------------------
// 11. PERCENTAGES
// ------------------------------------------------------------

var nonSnow_nonSnow_pct =
  nonSnow_nonSnow
    .divide(totalComparisonArea)
    .multiply(100);

var nonSnow_snow_pct =
  nonSnow_snow
    .divide(totalComparisonArea)
    .multiply(100);

var snow_nonSnow_pct =
  snow_nonSnow
    .divide(totalComparisonArea)
    .multiply(100);

var snow_snow_pct =
  snow_snow
    .divide(totalComparisonArea)
    .multiply(100);


// ------------------------------------------------------------
// 12. PRINT PERCENTAGES
// ------------------------------------------------------------

print(
  'Landsat Non-Snow → Sentinel Non-Snow (%):',
  nonSnow_nonSnow_pct
);

print(
  'Landsat Non-Snow → Sentinel Snow (%):',
  nonSnow_snow_pct
);

print(
  'Landsat Snow → Sentinel Non-Snow (%):',
  snow_nonSnow_pct
);

print(
  'Landsat Snow → Sentinel Snow (%):',
  snow_snow_pct
);


// ------------------------------------------------------------
// 13. CHECK
//
// All four categories should add up to
// approximately 100%.
// ------------------------------------------------------------

var percentageCheck =
  nonSnow_nonSnow_pct
    .add(nonSnow_snow_pct)
    .add(snow_nonSnow_pct)
    .add(snow_snow_pct);

print(
  'Cross-sensor percentage check (%):',
  percentageCheck
);


// ------------------------------------------------------------
// 14. COMPLETE
// ------------------------------------------------------------

print('========================================');
print('STEP 18C COMPLETE');
// ============================================================
// HIMALAYAN EYE
// STEP 19 — FINAL QUANTITATIVE RESULTS
// ============================================================

print('========================================');
print('STEP 19 — FINAL QUANTITATIVE RESULTS');
print('========================================');


// ------------------------------------------------------------
// 1. STUDY REGION AREA
// ------------------------------------------------------------

var studyAreaKm2 =
  roi.area().divide(1e6);

print(
  'Study region area (km²):',
  studyAreaKm2
);


// ------------------------------------------------------------
// 2. FINAL CLASS AREAS
// ------------------------------------------------------------

print('----------------------------------------');
print('MAPPED SURFACE-COVER AREA');
print('----------------------------------------');

print(
  '2015 Snow/Ice (km²):',
  30.06302256696634
);

print(
  '2015 Rock/Bare (km²):',
  12.312323499906109
);

print(
  '2015 Water (km²):',
  10.461438939739635
);


print(
  '2020 Snow/Ice (km²):',
  27.7917607064288
);

print(
  '2020 Rock/Bare (km²):',
  12.003243757550338
);

print(
  '2020 Water (km²):',
  7.821626620548028
);


print(
  '2025 Snow/Ice (km²):',
  32.63126645199477
);

print(
  '2025 Rock/Bare (km²):',
  8.883792770197784
);

print(
  '2025 Water (km²):',
  8.216645758150712
);


// ------------------------------------------------------------
// 3. MODEL VALIDATION
// ------------------------------------------------------------

print('----------------------------------------');
print('MODEL VALIDATION');
print('----------------------------------------');

print(
  'Random holdout accuracy:',
  98.99665551839465
);

print(
  'Random holdout Kappa:',
  0.9821100917431193
);

print(
  'Spatial checkerboard accuracy:',
  96.82741116751269
);

print(
  'Spatial checkerboard Kappa:',
  0.9468954028131956
);


// ------------------------------------------------------------
// 4. FEATURE IMPORTANCE
// ------------------------------------------------------------

print('----------------------------------------');
print('FEATURE IMPORTANCE');
print('----------------------------------------');

print(
  'NDSI importance:',
  48.51830755762701
);

print(
  'NDVI importance:',
  23.356047273241877
);

print(
  'NDWI importance:',
  26.442181380924648
);


// ------------------------------------------------------------
// 5. NDSI ABLATION
// ------------------------------------------------------------

print('----------------------------------------');
print('NDSI ABLATION');
print('----------------------------------------');

print(
  'Full model spatial accuracy:',
  96.82741116751269
);

print(
  'No-NDSI spatial accuracy:',
  96.06598984771574
);

print(
  'Accuracy difference (percentage points):',
  0.7614213197969507
);

print(
  'Full model Kappa:',
  0.9468954028131956
);

print(
  'No-NDSI Kappa:',
  0.9341502994883627
);


// ------------------------------------------------------------
// 6. TEMPORAL SNOW/ICE CHANGE
// ------------------------------------------------------------

print('----------------------------------------');
print('2015–2025 SNOW/ICE CHANGE');
print('----------------------------------------');

print(
  'Common-valid comparison area (km²):',
  47.559895711483136
);

print(
  'Stable Snow/Ice (km²):',
  25.72127216243896
);

print(
  'Snow/Ice loss (km²):',
  1.5268726765163054
);

print(
  'Snow/Ice gain (km²):',
  5.501342783623674
);

print(
  'Net Snow/Ice change (km²):',
  3.9744701071073685
);


// ------------------------------------------------------------
// 7. CROSS-SENSOR CONSISTENCY
// ------------------------------------------------------------

print('----------------------------------------');
print('LANDSAT vs SENTINEL-2');
print('----------------------------------------');

print(
  'Cross-sensor comparison area (km²):',
  49.731704980338804
);

print(
  'Agreement area (km²):',
  42.11813413756777
);

print(
  'Disagreement area (km²):',
  7.613570842773451
);

print(
  'Cross-sensor agreement (%):',
  84.69071019024781
);


// ------------------------------------------------------------
// 8. CROSS-SENSOR CONFUSION
// ------------------------------------------------------------

print('----------------------------------------');
print('CROSS-SENSOR CONFUSION');
print('----------------------------------------');

print(
  'Landsat Non-Snow → Sentinel Non-Snow (%):',
  33.007736320160056
);

print(
  'Landsat Non-Snow → Sentinel Snow (%):',
  1.3776492907057993
);

print(
  'Landsat Snow → Sentinel Non-Snow (%):',
  13.931640519051184
);

print(
  'Landsat Snow → Sentinel Snow (%):',
  51.68297387009034
);


// ------------------------------------------------------------
// 9. FINAL CHECK
// ------------------------------------------------------------

print('----------------------------------------');
print('FINAL PROJECT CHECK');
print('----------------------------------------');

print(
  'Spatial validation:',
  'COMPLETE'
);

print(
  'Temporal analysis:',
  'COMPLETE'
);

print(
  'Snow/Ice gain-loss mapping:',
  'COMPLETE'
);

print(
  'NDSI ablation:',
  'COMPLETE'
);

print(
  'Sentinel-2 consistency check:',
  'COMPLETE'
);

print('========================================');
print('STEP 19 COMPLETE');
print('========================================');
// ============================================================
// HIMALAYAN EYE
// STEP 20A — FINAL SNOW/ICE CHANGE MAP
// ============================================================

print('========================================');
print('STEP 20A — FINAL SNOW/ICE CHANGE MAP');
print('========================================');


// ------------------------------------------------------------
// 1. COMMON VALID MASK
// ------------------------------------------------------------

var commonMask20 =
  classified2015.mask()
    .and(
      classified2025.mask()
    );


// ------------------------------------------------------------
// 2. SNOW/ICE MASKS
//
// class 0 = Snow/Ice
// ------------------------------------------------------------

var snow2015_20 =
  classified2015
    .eq(0)
    .updateMask(commonMask20);

var snow2025_20 =
  classified2025
    .eq(0)
    .updateMask(commonMask20);


// ------------------------------------------------------------
// 3. CHANGE CATEGORIES
//
// 0 = No Snow/Ice
// 1 = Stable Snow/Ice
// 2 = Snow/Ice Loss
// 3 = Snow/Ice Gain
// ------------------------------------------------------------

var changeMap20 =
  ee.Image(0)
    .where(
      snow2015_20.and(snow2025_20),
      1
    )
    .where(
      snow2015_20.and(snow2025_20.not()),
      2
    )
    .where(
      snow2015_20.not().and(snow2025_20),
      3
    )
    .updateMask(commonMask20)
    .rename('SnowIceChange');


// ------------------------------------------------------------
// 4. VISUALIZATION
// ------------------------------------------------------------

var changeVis20 = {
  min: 0,
  max: 3,
  palette: [
    'lightgray',
    'white',
    'red',
    'blue'
  ]
};


// ------------------------------------------------------------
// 5. ADD FINAL MAP
// ------------------------------------------------------------

Map.addLayer(
  changeMap20,
  changeVis20,
  'FINAL Snow/Ice Change — 2015 to 2025',
  true
);


// ------------------------------------------------------------
// 6. ADD ROI OUTLINE
// ------------------------------------------------------------

Map.addLayer(
  roi,
  {
    color: 'yellow'
  },
  'Study Region Boundary',
  true
);


// ------------------------------------------------------------
// 7. MAP CENTER
// ------------------------------------------------------------

Map.centerObject(
  roi,
  12
);


// ------------------------------------------------------------
// 8. AREA CHECK
// ------------------------------------------------------------

var changeArea20 =
  ee.Image.pixelArea()
    .divide(1e6)
    .addBands(changeMap20);


var changeAreaStats20 =
  changeArea20.reduceRegion({
    reducer: ee.Reducer.sum().group({
      groupField: 1,
      groupName: 'change_class'
    }),
    geometry: roi,
    scale: 30,
    maxPixels: 1e9
  });


print(
  'FINAL Snow/Ice Change Area (km²):',
  changeAreaStats20
);


// ------------------------------------------------------------
// 9. COMPLETE
// ------------------------------------------------------------

print('========================================');
print('STEP 20A COMPLETE');
print('========================================');
// ============================================================
// HIMALAYAN EYE
// STEP 20B — FINAL MULTI-YEAR CLASSIFICATION MAPS
// ============================================================

print('========================================');
print('STEP 20B — MULTI-YEAR CLASSIFICATION');
print('========================================');


// ------------------------------------------------------------
// 1. CLASSIFICATION VISUALIZATION
//
// 0 = Snow/Ice
// 1 = Rock/Bare
// 2 = Water
// ------------------------------------------------------------

var classificationVis20 = {
  min: 0,
  max: 2,
  palette: [
    'white',
    'brown',
    'blue'
  ]
};


// ------------------------------------------------------------
// 2. 2015 CLASSIFICATION
// ------------------------------------------------------------

Map.addLayer(
  classified2015,
  classificationVis20,
  'RF Classification — 2015',
  true
);


// ------------------------------------------------------------
// 3. 2020 CLASSIFICATION
// ------------------------------------------------------------

Map.addLayer(
  classified2020,
  classificationVis20,
  'RF Classification — 2020',
  false
);


// ------------------------------------------------------------
// 4. 2025 CLASSIFICATION
// ------------------------------------------------------------

Map.addLayer(
  classified2025,
  classificationVis20,
  'RF Classification — 2025',
  false
);


// ------------------------------------------------------------
// 5. STUDY REGION
// ------------------------------------------------------------

Map.addLayer(
  roi,
  {
    color: 'yellow'
  },
  'Study Region Boundary — 20B',
  false
);


// ------------------------------------------------------------
// 6. MAP CENTER
// ------------------------------------------------------------

Map.centerObject(
  roi,
  12
);


// ------------------------------------------------------------
// 7. COMPLETE
// ------------------------------------------------------------

print('========================================');
print('STEP 20B COMPLETE');
print('========================================');
// ============================================================
// HIMALAYAN EYE
// STEP 20C — RANDOM FOREST FEATURE IMPORTANCE
// ============================================================

print('========================================');
print('STEP 20C — FEATURE IMPORTANCE');
print('========================================');


// ------------------------------------------------------------
// 1. GET RANDOM FOREST EXPLANATION
// ------------------------------------------------------------

var classifierExplanation =
  spatialClassifier2.explain();


// ------------------------------------------------------------
// 2. EXTRACT FEATURE IMPORTANCE
// ------------------------------------------------------------

var importance =
  ee.Dictionary(
    classifierExplanation.get('importance')
  );


// ------------------------------------------------------------
// 3. CONVERT DICTIONARY TO FEATURES
// ------------------------------------------------------------

var importanceFeatures =
  ee.FeatureCollection(
    importance.keys().map(
      function(key) {

        return ee.Feature(
          null,
          {
            feature: key,
            importance: importance.get(key)
          }
        );

      }
    )
  );


// ------------------------------------------------------------
// 4. PRINT IMPORTANCE TABLE
// ------------------------------------------------------------

print(
  'Random Forest Feature Importance:',
  importanceFeatures
);


// ------------------------------------------------------------
// 5. CREATE CHART
// ------------------------------------------------------------

var importanceChart =
  ui.Chart.feature.byFeature(
    importanceFeatures,
    'feature',
    'importance'
  )
  .setChartType('ColumnChart')
  .setOptions({

    title:
      'Random Forest Feature Importance',

    hAxis: {
      title: 'Feature',
      slantedText: true,
      slantedTextAngle: 45
    },

    vAxis: {
      title: 'Relative Importance'
    },

    legend: {
      position: 'none'
    },

    height: 500

  });


// ------------------------------------------------------------
// 6. DISPLAY CHART
// ------------------------------------------------------------

print(
  importanceChart
);


// ------------------------------------------------------------
// 7. COMPLETE
// ------------------------------------------------------------

print('========================================');
print('STEP 20C COMPLETE');
print('========================================');
// ============================================================
// HIMALAYAN EYE
// STEP 20D — TEMPORAL SNOW/ICE AREA TREND
// ============================================================

print('========================================');
print('STEP 20D — SNOW/ICE AREA TREND');
print('========================================');


// ------------------------------------------------------------
// 1. DEFINE YEAR-WISE SNOW/ICE AREA
// ------------------------------------------------------------

var snowArea2015 = 30.06302256696634;
var snowArea2020 = 27.7917607064288;
var snowArea2025 = 32.63126645199477;


// ------------------------------------------------------------
// 2. CREATE FEATURE COLLECTION
// ------------------------------------------------------------

var snowTrend = ee.FeatureCollection([

  ee.Feature(null, {
    year: 2015,
    snow_ice_area: snowArea2015
  }),

  ee.Feature(null, {
    year: 2020,
    snow_ice_area: snowArea2020
  }),

  ee.Feature(null, {
    year: 2025,
    snow_ice_area: snowArea2025
  })

]);


// ------------------------------------------------------------
// 3. PRINT TABLE
// ------------------------------------------------------------

print(
  'Snow/Ice Area by Year:',
  snowTrend
);


// ------------------------------------------------------------
// 4. CREATE LINE CHART
// ------------------------------------------------------------

var snowTrendChart =
  ui.Chart.feature.byFeature(
    snowTrend,
    'year',
    'snow_ice_area'
  )
  .setChartType('LineChart')
  .setOptions({

    title:
      'Temporal Snow/Ice Area Trend — Himalayan Eye',

    hAxis: {
      title: 'Year',
      format: '####'
    },

    vAxis: {
      title: 'Snow/Ice Area (km²)'
    },

    pointSize: 7,

    lineWidth: 3,

    legend: {
      position: 'none'
    },

    height: 500

  });


// ------------------------------------------------------------
// 5. DISPLAY CHART
// ------------------------------------------------------------

print(
  snowTrendChart
);


// ------------------------------------------------------------
// 6. PRINT CHANGE SUMMARY
// ------------------------------------------------------------

print(
  '2015 → 2020 change (km²):',
  snowArea2020 - snowArea2015
);

print(
  '2020 → 2025 change (km²):',
  snowArea2025 - snowArea2020
);

print(
  '2015 → 2025 change (km²):',
  snowArea2025 - snowArea2015
);


// ------------------------------------------------------------
// 7. COMPLETE
// ------------------------------------------------------------

print('========================================');
print('STEP 20D COMPLETE');
print('========================================');
// ============================================================
// HIMALAYAN EYE
// STEP 20E — TEMPORAL TRANSITION STATISTICS
// ============================================================

print('========================================');
print('STEP 20E — TRANSITION STATISTICS');
print('========================================');


// ------------------------------------------------------------
// 1. TRANSITION AREAS
// ------------------------------------------------------------

var transitionStats = ee.FeatureCollection([

  ee.Feature(null, {
    transition: 'Snow/Ice → Snow/Ice',
    area_km2: 25.721272162439917
  }),

  ee.Feature(null, {
    transition: 'Snow/Ice → Rock/Bare',
    area_km2: 0.3234096884102615
  }),

  ee.Feature(null, {
    transition: 'Snow/Ice → Water',
    area_km2: 1.2034629881060432
  }),

  ee.Feature(null, {
    transition: 'Rock/Bare → Snow/Ice',
    area_km2: 1.521042093290441
  }),

  ee.Feature(null, {
    transition: 'Rock/Bare → Rock/Bare',
    area_km2: 7.487261057878259
  }),

  ee.Feature(null, {
    transition: 'Rock/Bare → Water',
    area_km2: 2.5317650757281123
  }),

  ee.Feature(null, {
    transition: 'Water → Snow/Ice',
    area_km2: 3.980300690333228
  }),

  ee.Feature(null, {
    transition: 'Water → Rock/Bare',
    area_km2: 0.9024359470731848
  }),

  ee.Feature(null, {
    transition: 'Water → Water',
    area_km2: 3.8889460082237073
  })

]);


// ------------------------------------------------------------
// 2. PRINT TRANSITION TABLE
// ------------------------------------------------------------

print(
  '2015 → 2025 Common-Pixel Transition Areas:',
  transitionStats
);


// ------------------------------------------------------------
// 3. CREATE BAR CHART
// ------------------------------------------------------------

var transitionChart =
  ui.Chart.feature.byFeature(
    transitionStats,
    'transition',
    'area_km2'
  )
  .setChartType('ColumnChart')
  .setOptions({

    title:
      '2015 → 2025 Surface-Cover Transitions',

    hAxis: {
      title: 'Transition',
      slantedText: true,
      slantedTextAngle: 45
    },

    vAxis: {
      title: 'Area (km²)'
    },

    legend: {
      position: 'none'
    },

    height: 550

  });


// ------------------------------------------------------------
// 4. DISPLAY CHART
// ------------------------------------------------------------

print(
  transitionChart
);


// ------------------------------------------------------------
// 5. SNOW/ICE CHANGE SUMMARY
// ------------------------------------------------------------

print(
  'Snow/Ice stable area (km²):',
  25.721272162439917
);

print(
  'Snow/Ice loss area (km²):',
  1.5268726765163048
);

print(
  'Snow/Ice gain area (km²):',
  5.501342783623669
);

print(
  'Net Snow/Ice change (km²):',
  3.9744701071073645
);


// ------------------------------------------------------------
// 6. COMPLETE
// ------------------------------------------------------------

print('========================================');
print('STEP 20E COMPLETE');
print('========================================');
// ============================================================
// HIMALAYAN EYE
// STEP 21A — EXPORT 2025 CLASSIFICATION
// ============================================================

Export.image.toDrive({
  image: classified2025,
  description: 'Himalayan_Eye_Classification_2025',
  folder: 'Himalayan_Eye',
  fileNamePrefix: 'himalayan_eye_classification_2025',
  region: roi,
  scale: 30,
  maxPixels: 1e9
});

print('========================================');
print('STEP 21A — EXPORT TASK CREATED');
print('========================================');
 // ============================================================
 // HIMALAYAN EYE
 // STEP 21B — EXPORT 2015 & 2020 CLASSIFICATIONS
 // ============================================================

Export.image.toDrive({
  image: classified2015,
  description: 'Himalayan_Eye_Classification_2015',
  folder: 'Himalayan_Eye',
  fileNamePrefix: 'himalayan_eye_classification_2015',
  region: roi,
  scale: 30,
  maxPixels: 1e9
});


Export.image.toDrive({
  image: classified2020,
  description: 'Himalayan_Eye_Classification_2020',
  folder: 'Himalayan_Eye',
  fileNamePrefix: 'himalayan_eye_classification_2020',
  region: roi,
  scale: 30,
  maxPixels: 1e9
});


print('========================================');
print('STEP 21B — EXPORT TASKS CREATED');
print('========================================');
// ============================================================
// HIMALAYAN EYE
// STEP 21 — EXPORT FINAL RESULTS
// ============================================================

print('========================================');
print('STEP 21 — EXPORT TASKS');
print('========================================');


// ------------------------------------------------------------
// 1. EXPORT 2015 CLASSIFICATION
// ------------------------------------------------------------

Export.image.toDrive({
  image: classified2015,
  description: 'Himalayan_Eye_Classification_2015',
  folder: 'Himalayan_Eye',
  fileNamePrefix: 'himalayan_eye_classification_2015',
  region: roi,
  scale: 30,
  maxPixels: 1e9
});


// ------------------------------------------------------------
// 2. EXPORT 2020 CLASSIFICATION
// ------------------------------------------------------------

Export.image.toDrive({
  image: classified2020,
  description: 'Himalayan_Eye_Classification_2020',
  folder: 'Himalayan_Eye',
  fileNamePrefix: 'himalayan_eye_classification_2020',
  region: roi,
  scale: 30,
  maxPixels: 1e9
});


// ------------------------------------------------------------
// 3. COMMON VALID PIXELS — 2015 & 2025
// ------------------------------------------------------------

var finalCommonMask =
  classified2015.mask()
    .and(classified2025.mask());


// ------------------------------------------------------------
// 4. SNOW/ICE MASKS
// ------------------------------------------------------------

var finalSnow2015 =
  classified2015.eq(0);

var finalSnow2025 =
  classified2025.eq(0);


// ------------------------------------------------------------
// 5. FINAL CHANGE CATEGORIES
// ------------------------------------------------------------

// 0 = No Snow/Ice
// 1 = Stable Snow/Ice
// 2 = Snow/Ice Loss
// 3 = Snow/Ice Gain

var finalChangeMap =
  ee.Image(0)
    .where(
      finalSnow2015
        .and(finalSnow2025)
        .and(finalCommonMask),
      1
    )
    .where(
      finalSnow2015
        .and(finalSnow2025.not())
        .and(finalCommonMask),
      2
    )
    .where(
      finalSnow2015.not()
        .and(finalSnow2025)
        .and(finalCommonMask),
      3
    )
    .updateMask(finalCommonMask);


// ------------------------------------------------------------
// 6. DISPLAY FINAL CHANGE MAP
// ------------------------------------------------------------

Map.addLayer(
  finalChangeMap,
  {
    min: 0,
    max: 3,
    palette: [
      'lightgray',
      'white',
      'red',
      'blue'
    ]
  },
  'FINAL Snow/Ice Change Map'
);


// ------------------------------------------------------------
// 7. EXPORT FINAL CHANGE MAP
// ------------------------------------------------------------

Export.image.toDrive({
  image: finalChangeMap,
  description: 'Himalayan_Eye_Snow_Ice_Change_2015_2025',
  folder: 'Himalayan_Eye',
  fileNamePrefix: 'himalayan_eye_snow_ice_change_2015_2025',
  region: roi,
  scale: 30,
  maxPixels: 1e9
});


print('========================================');
print('STEP 21 — ALL EXPORT TASKS CREATED');
print('========================================');
// ============================================================
// HIMALAYAN EYE
// STEP 22A — FINAL SNOW/ICE AREA STATISTICS
// ============================================================

print('========================================');
print('STEP 22A — FINAL AREA STATISTICS');
print('========================================');


// ------------------------------------------------------------
// 1. PIXEL AREA
// ------------------------------------------------------------

var pixelArea = ee.Image.pixelArea();


// ------------------------------------------------------------
// 2. SNOW/ICE AREA — 2015
// ------------------------------------------------------------

var snowArea2015 =
  pixelArea
    .updateMask(finalSnow2015)
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: roi,
      scale: 30,
      maxPixels: 1e9
    });


// ------------------------------------------------------------
// 3. SNOW/ICE AREA — 2025
// ------------------------------------------------------------

var snowArea2025 =
  pixelArea
    .updateMask(finalSnow2025)
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: roi,
      scale: 30,
      maxPixels: 1e9
    });


// ------------------------------------------------------------
// 4. CONVERT m² → km²
// ------------------------------------------------------------

var snowArea2015Km2 =
  ee.Number(snowArea2015.get('area'))
    .divide(1e6);

var snowArea2025Km2 =
  ee.Number(snowArea2025.get('area'))
    .divide(1e6);


// ------------------------------------------------------------
// 5. PRINT RESULTS
// ------------------------------------------------------------

print(
  'Snow/Ice Area 2015 (km²):',
  snowArea2015Km2
);

print(
  'Snow/Ice Area 2025 (km²):',
  snowArea2025Km2
);


// ------------------------------------------------------------
// 6. NET CHANGE
// ------------------------------------------------------------

var netChangeKm2 =
  snowArea2025Km2
    .subtract(snowArea2015Km2);

print(
  'Net Snow/Ice Change 2015–2025 (km²):',
  netChangeKm2
);


print('========================================');
print('STEP 22A — COMPLETE');
print('========================================');
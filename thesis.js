print("I'm starting");

// Function to apply cloud mask based on Pixel QA band
var applyCloudMask = function(image) {
  var qa = image.select('QA_PIXEL');
  var cloudMask = qa.bitwiseAnd(1 << 3).eq(0);
  var cloudShadowMask = qa.bitwiseAnd(1 << 4).eq(0);
  var snowMask = qa.bitwiseAnd(1 << 5).eq(0);
  var combinedMask = cloudMask.and(snowMask).and(cloudShadowMask);
  return image.updateMask(combinedMask);
};

// Landsat 5 and 7 surface reflectance collections
var L5collection = ee.ImageCollection('LANDSAT/LT05/C02/T1_L2')
  .filterBounds(table)
  .select(['SR_B4', 'SR_B3', 'QA_PIXEL'])
  .filter(ee.Filter.lt('CLOUD_COVER', 50))
  .map(applyCloudMask);

var L7collection = ee.ImageCollection('LANDSAT/LE07/C02/T1_L2')
  .filterBounds(table)
  .select(['SR_B4', 'SR_B3', 'QA_PIXEL'])
  .filter(ee.Filter.lt('CLOUD_COVER', 50))
  .map(applyCloudMask);

// Merge the collections
var mergedCollection = ee.ImageCollection(L5collection.merge(L7collection));

// Function to calculate NDVI for Landsat 5 and 7
var calculateNDVI_L5_L7 = function(image) {
  var nir = image.select('SR_B4').multiply(0.0000275).add(-0.2);
  var red = image.select('SR_B3').multiply(0.0000275).add(-0.2);
  var ndvi = nir.subtract(red).divide(nir.add(red)).rename('NDVI');
  return image.addBands(ndvi);
};

// Apply NDVI calculation to the merged collection
var ndviCollection = mergedCollection.map(calculateNDVI_L5_L7);

// Clip the NDVI collection to the study area
var clippedCollection = ndviCollection.map(function(image) {
  return image.clip(table);
});

// Normalize the NDVI values to the range -1 to 1
var normalizeNDVI = function(image) {
  var ndvi = image.select('NDVI');
  var normalizedNDVI = ndvi.multiply(2).subtract(1).rename('NDVI_normalized');
  return image.addBands(normalizedNDVI);
};

// Apply range normalization to the NDVI collection
var normalizedCollection = clippedCollection.map(normalizeNDVI);

// Get the NDVI values for each point in the table
var ndviData = normalizedCollection.map(function(image) {
  var ndvi = image.select('NDVI_normalized');
  var reduced = ndvi.reduceRegions({
    collection: table,
    reducer: ee.Reducer.median(),
    scale: 30
  });
  return reduced;
}).flatten();

// Filter out features without NDVI values
ndviData = ndviData.filter(ee.Filter.notNull(['NDVI_normalized']));

// Export the NDVI data as a CSV file
Export.table.toDrive({
  collection: ndviData,
  description: 'NDVI_data',
  folder: 'GEE_exports',
  fileFormat: 'CSV'
});

print("Exporting NDVI data...");

print("I'm finished");

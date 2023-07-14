var studyArea = /* color: #d63000 */ee.Geometry.Polygon(
  [[[15.84163596403949, 41.86313674445768],
    [15.843009255055115, 41.849839661334535],
    [15.921973488453553, 41.81965525670359],
    [15.91854026091449, 41.80788459875763],
    [15.895194313648865, 41.81044362144732],
    [15.882148049000428, 41.804813636595014],
    [15.87459494841449, 41.81709660202706],
    [15.892447731617615, 41.76180471111171],
    [15.908240578297303, 41.745925082086984],
    [15.924720070484803, 41.752072501296894],
    [15.950125954273865, 41.74490045498708],
    [15.952185890797303, 41.76231689179941],
    [15.978278420094178, 41.75719490095445],
    [16.007117531422303, 41.758219331828705],
    [16.04213645232074, 41.720817011037205],
    [16.046942970875428, 41.73875234900425],
    [16.076468727711365, 41.7433634836778],
    [16.067542336109803, 41.77716835333814],
    [16.09706809294574, 41.78792071354573],
    [16.099128029469178, 41.81249076599745],
    [16.10256125700824, 41.8344934378546],
    [16.128653786305115, 41.86364811552005],
    [16.138953468922303, 41.87847609722207],
    [16.086768410328553, 41.89687846153343],
    [16.005744240406678, 41.8677389367845],
    [15.95973899138324, 41.839097691353494],
    [15.889701149586365, 41.86262536930552]]]);

// Load the Hansen Global Forest Change dataset
var hansen = ee.Image('UMD/hansen/global_forest_change_2015');

// Select the forest cover band
var forestCover = hansen.select('treecover2000');

// Define a forest mask based on the tree cover threshold
var forestMask = forestCover.gt(30); // Adjust the threshold as needed

// Convert the forest mask to a binary mask (0 for non-forest, 1 for forest)
var binaryMask = forestMask.updateMask(forestMask);

// Convert the binary mask to a geometry object representing forest areas
var forestGeometry = binaryMask.reduceToVectors({
  geometry: studyArea,
  scale: 30,
  geometryType: 'polygon',
  eightConnected: false,
  labelProperty: 'binaryMask',
});

// Load Landsat 5, 7, and 8 surface reflectance collections (C02/T1_L2)
var l5L2 = ee.ImageCollection('LANDSAT/LT05/C02/T1_L2')
  .filterBounds(studyArea);
var l7L2 = ee.ImageCollection('LANDSAT/LE07/C02/T1_L2')
  .filterBounds(studyArea);
var l8L2 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .filterBounds(studyArea);

// Merge the collections into a single collection
var mergedCollection = l5L2.merge(l7L2).merge(l8L2);

// Select a specific image from the collection
var image = ee.Image(mergedCollection.first());

// Clip the image to the study area
var clippedImage = image.clip(studyArea);

// Apply the forest mask to the clipped image
var forestImage = clippedImage.updateMask(binaryMask);

// Get the image's band names
var bandNames = image.bandNames();
var seedValue = 124;
// Generate random points within the forest geometry
var randomPoints = ee.FeatureCollection.randomPoints({
  region: forestGeometry,
  points: 2500,
  seed: seedValue
});

// Sample the forest image at the random points
var sampledData = forestImage.sampleRegions({
  collection: randomPoints,
  properties: bandNames.getInfo(), // Convert bandNames to a plain list of strings
  scale: 30, // Specify the pixel scale
});

var coordinates = randomPoints.geometry().coordinates();
print('Random Points Coordinates:', coordinates);

var assetPath = 'users/hondjuuhx/ee-thesis-uu-2023/'
// Export the FeatureCollection to the asset
Export.table.toAsset({
  collection: randomPoints,
  description: 'FeatureCollection to Asset',
  assetId: assetPath
});

// Display the forest image
Map.addLayer(forestImage, {bands: ['SR_B4', 'SR_B3', 'SR_B2'], max: 3000}, 'Forest Image');

// Display the sample area (random points)
Map.addLayer(randomPoints, {color: 'red'}, 'Sample Area');

print('Sampled Data:', sampledData); // Print the sampled pixel values

Map.centerObject(studyArea, 10);

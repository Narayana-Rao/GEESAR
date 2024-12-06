 /*

1. Import ALOS-2/PALSAR-2 ScanSAR level 2.2 data
2. Clip the data to desired region of interest
3. Convert the DN to sigma_0 
4. Create training labels 
5. Train the Random Forest classifier
7. Classify the data and generate accuracy metrics
8. Export data to drive

Author:Narayanarao Bhogapurapu
Web:https://Narayana-Rao.github.io

*/

var forest = ee.Geometry.Polygon(
        [[[72.89726865303983, 19.214173208272772],
          [72.89726865303983, 19.20315010828695],
          [72.90876996529569, 19.20315010828695],
          [72.90876996529569, 19.214173208272772]]], null, false);
var water = ee.Geometry.Polygon(
        [[[72.7417434455203, 19.1009892512269],
          [72.7417434455203, 19.078278256609206],
          [72.76989591134061, 19.078278256609206],
          [72.76989591134061, 19.1009892512269]]], null, false);
var urban = ee.Geometry.Polygon(
        [[[72.92985137587459, 19.152439613401768],
          [72.92985137587459, 19.149520712015804],
          [72.93285544997127, 19.149520712015804],
          [72.93285544997127, 19.152439613401768]]], null, false);
var roi = ee.Geometry.Polygon(
        [[[72.60950833177105, 19.412921358704814],
          [72.60950833177105, 18.75103203755674],
          [73.36207180833355, 18.75103203755674],
          [73.36207180833355, 19.412921358704814]]], null, false);
var soil = ee.Geometry.Polygon(
        [[[73.15300708544541, 19.093249433166108],
          [73.15300708544541, 19.091639920127562],
          [73.15445816052247, 19.091639920127562],
          [73.15445816052247, 19.093249433166108]]], null, false);
var forest_val = ee.Geometry.Polygon(
        [[[72.91573675650854, 19.18259033056585],
          [72.91573675650854, 19.176753543750735],
          [72.9220882274558, 19.176753543750735],
          [72.9220882274558, 19.18259033056585]]], null, false);
var water_val = ee.Geometry.Polygon(
        [[[72.75111349601049, 19.172733024394038],
          [72.75111349601049, 19.15457236688958],
          [72.77205618399877, 19.15457236688958],
          [72.77205618399877, 19.172733024394038]]], null, false);
var urban_val = ee.Geometry.Polygon(
        [[[72.94964431201322, 19.209993072268382],
          [72.94964431201322, 19.204319365919336],
          [72.95479415332181, 19.204319365919336],
          [72.95479415332181, 19.209993072268382]]], null, false);
var soil_val = ee.Geometry.Polygon(
        [[[73.15884940806941, 19.089433053364587],
          [73.15884940806941, 19.087914753726746],
          [73.16081444702608, 19.087914753726746],
          [73.16081444702608, 19.089433053364587]]], null, false);


// Load ALOS PALSAR-2 image collection and filter by location and date
var collection = ee.ImageCollection('JAXA/ALOS/PALSAR-2/Level2_2/ScanSAR')
  .filterBounds(ee.Geometry.Point(72.8, 18))  // Set a location of interest
  .filterDate(ee.Date('2024-02-01'), ee.Date('2024-12-31'));  // Date range
print(collection);

// Select a specific image from the collection and clip it (assuming the geometry is defined)
var image = collection.first().clip(roi);  // Assuming 'geometry' is already defined

// Select the required bands: HH, HV, and Incidence angle
var selectedBands = image.select(['HH', 'HV', 'LIN']);

// Visualize the selected bands (optional)
Map.addLayer(selectedBands, {min: 2000, max: 20000}, 'ALOS PALSAR-2');
Map.centerObject(image);


// Define training points (you can replace these with labeled data
// Convert geometries to features with class labels
var forestClass = ee.Feature(forest).set('class', 0);  // Class 0 for forest
var waterClass = ee.Feature(water).set('class', 1);  // Class 1 for water
var urbanClass = ee.Feature(urban).set('class', 2);  // Class 2 for urban
var soilClass = ee.Feature(soil).set('class', 3);  // Class 3 for soil
var trainingPolygons = ee.FeatureCollection([forestClass, waterClass,urbanClass,soilClass]);


// Sample the image at the training points and add the class labels
var training = selectedBands.sampleRegions({
  collection: trainingPolygons,
  properties: ['class'],
  scale: 25  // Set the scale to match the image resolution
});

// Train the Random Forest classifier
var classifier = ee.Classifier.smileRandomForest(50)  // 50 trees
  .train({
    features: training,
    classProperty: 'class',
    inputProperties: ['HH', 'HV', 'LIN']
  });

// Classify the image using the trained classifier
var classified = selectedBands.classify(classifier);

// Visualize the classification result
Map.addLayer(classified, {min: 0, max: 3, palette: ['green','blue', 'red','#80554f']}, 'Classified Image');


var refForest = ee.Feature(forest).set('class', 0);  // Class 0 for forest
var refWater = ee.Feature(water).set('class', 1);  // Class 1 for water
var refUrban = ee.Feature(urban).set('class', 2);  // Class 2 for urban
var refSoil = ee.Feature(soil).set('class', 3);  // Class 3 for soil
// Combine reference data into one FeatureCollection
var referencePolygons = ee.FeatureCollection([refForest, refWater, refUrban, refSoil]);


// Sample the classified image at the reference points
var referenceData = classified.sampleRegions({
  collection: referencePolygons,
  properties: ['class'],
  scale: 25
});

// Compute the confusion matrix
var confusionMatrix = referenceData.errorMatrix('class', 'classification');
print('Confusion Matrix:', confusionMatrix);

// Compute overall accuracy
var overallAccuracy = confusionMatrix.accuracy();
print('Overall Accuracy (OA):', overallAccuracy);

// Compute Kappa coefficient
var kappaCoefficient = confusionMatrix.kappa();
print('Kappa Coefficient:', kappaCoefficient);

// // Optionally, export the classified image
// Export.image.toDrive({
//   image: classified,
//   description: 'ALOS_PALSAR2_Classification',
//   scale: 25,
//   region: image.geometry(),
//   fileFormat: 'GeoTIFF'
// });
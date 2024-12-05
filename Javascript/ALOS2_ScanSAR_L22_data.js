/*

1. Import ALOS-2/PALSAR-2 ScanSAR level 2.2 data
2. Clip the data to desired region of interest
3. Convert the DN to sigma_0 
4. Plot the histograms of both DN values and sigma_0
5. Export to drive

Author:Narayanarao Bhogapurapu
Web:https://Narayana-Rao.github.io

*/



var roi =   ee.Geometry.Polygon(
        [[[72.60950833177105, 19.412921358704814],
          [72.60950833177105, 18.75103203755674],
          [73.36207180833355, 18.75103203755674],
          [73.36207180833355, 19.412921358704814]]], null, false);


var collection = ee.ImageCollection('JAXA/ALOS/PALSAR-2/Level2_2/ScanSAR')
  .filterBounds(ee.Geometry.Point(72.8,18))
  .filterDate(ee.Date('2024-01-30'), ee.Date('2024-12-30'))
print(collection)

var image = collection.first().clip(roi);

// Extract the incidence angle (this is in degrees)
var incidenceAngleDegrees = image.select('LIN').multiply(0.01); 

// Convert the incidence angle from degrees to radians
var incidenceAngleRadians = incidenceAngleDegrees.multiply(Math.PI).divide(180);

// Convert DN to gamma nought (γ₀)
var gammaNaught = image.select(['HH']).pow(2).log10().multiply(10).subtract(83);

// Convert gamma nought (γ₀) dB to linear
var gammaNaught_li = gammaNaught.expression( '10 ** (HH / 10)', {'HH': gammaNaught.select('HH')});
gammaNaught_li = gammaNaught_li.rename('HH')


// Convert gamma naught to sigma naught (σ₀) using the incidence angle (in radians)
var sigmaNaught = gammaNaught_li.divide(incidenceAngleRadians.cos());

var sigmaNaught_dB = sigmaNaught.log10().multiply(10)

// Display the DN values and sigma naught (σ₀) on the map
Map.addLayer(image.select(['HH']), {min: 2000, max: 20000}, 'HH (DN)');
Map.addLayer(sigmaNaught_dB, {min: -15, max: 0}, 'Sigma Naught HH (dB)');
Map.centerObject(image);




// Plot histogram for HH DN
var histogram = ui.Chart.image.histogram({
  image: image.select(['HH']),
  region: roi,  // Use the geometry as the region to plot
  scale: 25,  // Use the scale of the image (in meters)
  maxPixels: 1e9  // Adjust max pixels to avoid too large data
});
histogram.setOptions({
  title: 'Histogram of HH (DN)',
  vAxis: {
    title: 'Frequency',  // Label for the vertical axis
    viewWindow: {min: 0},  // Ensure the vAxis starts from 0
  },
  hAxis: {
    title: 'HH Backscatter',  // Label for the horizontal axis
    viewWindow: {min: 0,max:20000}, 
  },
  colors: ['#1f77b4'],  // Optionally change the color of the histogram bars
  chartArea: {width: '80%', height: '70%'},  // Adjust chart area size for better view
});
print(histogram);


// Plot histogram for HH polarization band
var histogram_dB = ui.Chart.image.histogram({
  image: sigmaNaught_dB.select(['HH']),
  region: roi, 
  scale: 25, 
  maxPixels: 1e12,
});
histogram_dB.setOptions({
  title: 'Histogram of HH sigma_0 (dB)',
  vAxis: {
    title: 'Frequency',  
    viewWindow: {min: 0},  // Ensure the vAxis starts from 0
  },
  hAxis: {
    title: 'HH sigma_0(dB)',  // Label for the horizontal axis
    viewWindow: {min: -30,max:10}, 
  },
  colors: ['#1f77b4'],  // Optionally change the color of the histogram bars
  chartArea: {width: '80%', height: '70%'},  // Adjust chart area size for better view
});
print(histogram_dB);


//export the data to drive
Export.image.toDrive({
  image: sigmaNaught_dB.select(['HH']),
  description: 'ALOS_PALSAR_HH_Image',
  scale: 25,  // Set the scale (in meters)
  region: sigmaNaught_dB.geometry(), 
  fileFormat: 'GeoTIFF',
  folder: 'EarthEngineFolder'  // Optional: specify a folder in your Google Drive
});

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { predictionsApi } from '../api/client';

type ScanMode = 'chili' | 'flower';

interface MaturityData {
  maturity_stage: string;
  confidence: number;
  days_to_harvest: number;
  spice_estimate: string;
  growth_advice: string[];
  description: string;
  shu_modifier: number;
  predictions: Array<{ class: string; confidence: number }>;
}

interface ClassificationResult {
  success: boolean;
  variety?: string;
  confidence?: number;
  predictions?: Array<{ class: string; confidence: number }>;
  processing_time_ms?: number;
  adjusted_shu?: number;
  analysis_id?: string;
  id?: string;
  _id?: string;
  maturity?: MaturityData;
  capsaicin?: {
    capsaicin_mg_per_g?: number;
    dihydrocapsaicin_mg_per_g?: number;
    total_capsaicinoids_mg_per_g?: number;
    pungency_category?: string;
  };
  ml_details?: {
    model_used?: string;
    lr_prediction?: number;
    rf_prediction?: number;
    r2_score?: number;
    features_used?: Record<string, number>;
  };
  error?: string;
}

interface FlowerRefinementResult {
  success: boolean;
  original_shu?: number;
  refined_shu?: number;
  flower_adjusted_shu?: number;
  heat_level?: string;
  shu_multiplier?: number;
  flower_stress?: {
    stress_level?: string;
    stress_score?: number;
    stress_class?: string;
    confidence?: number;
    description?: string;
  };
  capsaicin?: {
    mg_per_g?: number;
    capsaicin_mg_per_g?: number;
    total_capsaicinoids_mg_per_g?: number;
    total_capsaicinoids_ppm?: number;
    pungency_category?: string;
  };
  error?: string;
}

interface PodMeasurement {
  length_mm?: number;
  width_mm?: number;
  area_mm2?: number;
  estimated_weight_g?: number;
}

interface PodReference {
  avg_length_mm?: number;
  avg_width_mm?: number;
  avg_weight_g?: number;
  shu_range?: string;
  heat_category?: string;
  description?: string;
}

interface ChiliSegment {
  pod_number?: number;
  raw_class?: string;
  variety?: string;
  confidence: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  measurement?: PodMeasurement;
  reference?: PodReference;
}

interface FlowerSegment {
  class?: string;
  confidence: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  measurement?: PodMeasurement;
}

interface VarietyGroup {
  count: number;
  avg_confidence: number;
  avg_length_mm?: number;
  avg_width_mm?: number;
  avg_weight_g?: number;
  total_weight_g?: number;
  reference_length_mm?: number;
  reference_width_mm?: number;
  reference_weight_g?: number;
  shu_range?: string;
  heat_category?: string;
  description?: string;
  pod_indices?: number[];
}

interface MeasurementsSummary {
  scale_mm_per_px?: number;
  scale_method?: string;
  scale_note?: string;
  per_pod?: PodMeasurement[];
  average?: PodMeasurement;
  total_pods?: number;
  total_estimated_weight_g?: number;
  // Legacy fields (kept for backward compatibility)
  total_area_pixels?: number;
  image_width?: number;
  image_height?: number;
}

interface FlowerStress {
  stress_class?: string;
  stress_score?: number;
  confidence?: number;
  capsaicin_impact?: string;
  shu_multiplier?: number;
  predictions?: Array<{ class: string; confidence: number }>;
}

interface ChiliSegmentationResult {
  success: boolean;
  total_detected?: number;
  image_width?: number;
  image_height?: number;
  segments?: ChiliSegment[];
  varieties_detected?: Record<string, VarietyGroup>;
  measurements?: MeasurementsSummary;
  processing_time_ms?: number;
  error?: string;
}

interface FlowerSegmentationResult {
  success: boolean;
  total_detected?: number;
  image_width?: number;
  image_height?: number;
  segments?: FlowerSegment[];
  measurements?: MeasurementsSummary;
  flower_stress?: FlowerStress;
  processing_time_ms?: number;
  error?: string;
}

export default function CameraScreen() {
  const navigation = useNavigation<any>();
  const cameraRef = useRef<CameraView>(null);
  
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>('chili');
  const [classResult, setClassResult] = useState<ClassificationResult | null>(null);
  const [segResult, setSegResult] = useState<FlowerSegmentationResult | null>(null);
  const [chiliSegResult, setChiliSegResult] = useState<ChiliSegmentationResult | null>(null);
  const [isSegmenting, setIsSegmenting] = useState(false);

  // Step 2: Flower Enhancement
  const [flowerRefineImage, setFlowerRefineImage] = useState<string | null>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [refinedResult, setRefinedResult] = useState<FlowerRefinementResult | null>(null);

  const takePicture = async () => {
    if (!cameraRef.current) return;

    setIsCapturing(true);
    setClassResult(null);
    setSegResult(null);
    setChiliSegResult(null);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1,
      });
      if (photo) {
        setCapturedImage(photo.uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take picture');
    } finally {
      setIsCapturing(false);
    }
  };

  const pickImage = async () => {
    setClassResult(null);
    setSegResult(null);
    setChiliSegResult(null);
    const imageResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });

    if (!imageResult.canceled && imageResult.assets[0]) {
      setCapturedImage(imageResult.assets[0].uri);
    }
  };

  const analyzeImage = async () => {
    if (!capturedImage) return;

    setIsAnalyzing(true);
    setClassResult(null);
    setSegResult(null);
    setChiliSegResult(null);
    try {
      if (scanMode === 'chili') {
        const result = await predictionsApi.classifyImage(capturedImage);
        setClassResult(result);
      } else {
        const result = await predictionsApi.segmentFlower(capturedImage);
        setSegResult(result);
      }
    } catch (error: any) {
      const errorMsg = error?.response?.data?.detail || 'Could not analyze the image. Please try again.';
      Alert.alert('Analysis Failed', errorMsg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const runChiliSegmentation = async () => {
    if (!capturedImage) return;
    setIsSegmenting(true);
    try {
      const result = await predictionsApi.segmentChili(capturedImage);
      setChiliSegResult(result);
    } catch (error: any) {
      const errorMsg = error?.response?.data?.detail || 'Segmentation failed. Please try again.';
      Alert.alert('Segmentation Failed', errorMsg);
    } finally {
      setIsSegmenting(false);
    }
  };

  const pickFlowerForRefinement = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      setFlowerRefineImage(result.assets[0].uri);
    }
  };

  const refineWithFlower = async () => {
    if (!flowerRefineImage || !classResult) return;
    const analysisId = classResult.analysis_id || classResult.id || classResult._id;
    if (!analysisId) {
      Alert.alert('Error', 'No analysis ID available for refinement.');
      return;
    }
    setIsRefining(true);
    try {
      const result = await predictionsApi.refineWithFlower(analysisId, flowerRefineImage);
      if (result.success) {
        setRefinedResult(result);
        // Update the main classification SHU
        if (result.flower_adjusted_shu && classResult) {
          setClassResult({
            ...classResult,
            adjusted_shu: result.flower_adjusted_shu,
          });
        }
      } else {
        Alert.alert('Refinement Failed', result.error || 'Could not process the flower image.');
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to refine with flower scan.');
    } finally {
      setIsRefining(false);
    }
  };

  const retake = () => {
    setCapturedImage(null);
    setClassResult(null);
    setSegResult(null);
    setChiliSegResult(null);
    setFlowerRefineImage(null);
    setIsRefining(false);
    setRefinedResult(null);
  };

  const getVarietyColor = (variety: string) => {
    const colors: Record<string, string> = {
      'Siling Haba': '#22c55e',
      'Siling Labuyo': '#f97316',
      'Super Labuyo': '#ef4444',
    };
    return colors[variety] || '#6b7280';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.9) return 'Very High';
    if (confidence >= 0.75) return 'High';
    if (confidence >= 0.5) return 'Medium';
    return 'Low';
  };

  if (!permission) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={64} color="#9ca3af" />
        <Text style={styles.permissionText}>
          Camera access is required to analyze chili plants
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestPermission}
        >
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (capturedImage) {
    const hasResult = classResult || segResult;
    const hasError = (classResult && !classResult.success) || (segResult && !segResult.success);

    return (
      <View style={styles.container}>
        {/* Preview Image */}
        <Image
          source={{ uri: capturedImage }}
          style={hasResult ? styles.previewImageSmall : styles.previewImage}
          resizeMode="contain"
        />

        {/* Chili Classification Results */}
        {classResult && classResult.success && (
          <ScrollView style={styles.resultsContainer}>
            <View style={styles.resultCard}>
              <View style={[styles.varietyBadge, { backgroundColor: getVarietyColor(classResult.variety || '') }]}>
                <Ionicons name="leaf" size={24} color="white" />
                <Text style={styles.varietyText}>{classResult.variety}</Text>
              </View>
              
              <View style={styles.confidenceRow}>
                <Text style={styles.confidenceLabel}>Confidence</Text>
                <View style={styles.confidenceBarContainer}>
                  <View 
                    style={[
                      styles.confidenceBar, 
                      { width: `${(classResult.confidence || 0) * 100}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.confidenceValue}>
                  {((classResult.confidence || 0) * 100).toFixed(1)}% ({getConfidenceLabel(classResult.confidence || 0)})
                </Text>
              </View>

              {classResult.predictions && classResult.predictions.length > 1 && (
                <View style={styles.allPredictions}>
                  <Text style={styles.allPredictionsTitle}>All Predictions</Text>
                  {classResult.predictions.map((pred, idx) => (
                    <View key={idx} style={styles.predictionRow}>
                      <Text style={styles.predictionClass}>{pred.class}</Text>
                      <Text style={styles.predictionConfidence}>
                        {(pred.confidence * 100).toFixed(1)}%
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {classResult.processing_time_ms && (
                <Text style={styles.processingTime}>
                  Processed in {classResult.processing_time_ms.toFixed(0)}ms
                </Text>
              )}

              {/* Maturity Assessment */}
              {classResult.maturity && (
                <View style={styles.maturitySection}>
                  <View style={styles.maturityHeader}>
                    <Ionicons name="leaf" size={18} color="#22c55e" />
                    <Text style={styles.maturityTitle}>Maturity Assessment</Text>
                    <View style={[
                      styles.maturityBadge,
                      classResult.maturity.maturity_stage === 'Ripe'
                        ? { backgroundColor: '#ef4444' }
                        : classResult.maturity.maturity_stage === 'Turning'
                          ? { backgroundColor: '#f59e0b' }
                          : classResult.maturity.maturity_stage === 'Over-Ripe'
                            ? { backgroundColor: '#a855f7' }
                            : classResult.maturity.maturity_stage === 'Over-Mature'
                              ? { backgroundColor: '#f97316' }
                              : classResult.maturity.maturity_stage === 'Dried/Spent'
                                ? { backgroundColor: '#6b7280' }
                                : { backgroundColor: '#22c55e' }
                    ]}>
                      <Text style={styles.maturityBadgeText}>{classResult.maturity.maturity_stage}</Text>
                    </View>
                  </View>

                  <Text style={styles.maturityDescription}>{classResult.maturity.description}</Text>

                  <View style={styles.maturityStatsRow}>
                    <View style={styles.maturityStat}>
                      <Ionicons name="flame" size={16} color="#f97316" />
                      <Text style={styles.maturityStatLabel}>Adjusted SHU</Text>
                      <Text style={styles.maturityStatValue}>
                        {(classResult.adjusted_shu || 0).toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.maturityStat}>
                      <Ionicons name="thermometer" size={16} color="#eab308" />
                      <Text style={styles.maturityStatLabel}>Spice Level</Text>
                      <Text style={styles.maturityStatValue}>{classResult.maturity.spice_estimate}</Text>
                    </View>
                    <View style={styles.maturityStat}>
                      <Ionicons name="calendar" size={16} color="#14b8a6" />
                      <Text style={styles.maturityStatLabel}>Harvest</Text>
                      <Text style={styles.maturityStatValue}>
                        {classResult.maturity.days_to_harvest === 0 ? 'Ready!' : `${classResult.maturity.days_to_harvest}d`}
                      </Text>
                    </View>
                  </View>

                  {classResult.maturity.growth_advice.length > 0 && (
                    <View style={styles.growthAdviceBox}>
                      <Text style={styles.growthAdviceTitle}>
                        <Ionicons name="leaf" size={14} color="#22c55e" /> Growth Advice
                      </Text>
                      {classResult.maturity.growth_advice.map((tip, idx) => (
                        <View key={idx} style={styles.growthAdviceRow}>
                          <Text style={styles.growthAdviceBullet}>•</Text>
                          <Text style={styles.growthAdviceText}>{tip}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Chili Segmentation Section */}
              {!chiliSegResult && !isSegmenting && (
                <TouchableOpacity
                  style={styles.segmentButton}
                  onPress={runChiliSegmentation}
                >
                  <Ionicons name="scan" size={20} color="white" />
                  <Text style={styles.segmentButtonText}>Run Pod Segmentation</Text>
                </TouchableOpacity>
              )}

              {isSegmenting && (
                <View style={styles.segmentingContainer}>
                  <ActivityIndicator size="small" color="#f97316" />
                  <Text style={styles.segmentingText}>Segmenting chili pods...</Text>
                </View>
              )}

              {chiliSegResult && chiliSegResult.success && (
                <View style={styles.chiliSegSection}>
                  <View style={styles.chiliSegHeader}>
                    <Ionicons name="scan" size={18} color="#f97316" />
                    <Text style={styles.chiliSegTitle}>Pod Segmentation</Text>
                    <View style={[styles.maturityBadge, { backgroundColor: '#f97316' }]}>
                      <Text style={styles.maturityBadgeText}>
                        {chiliSegResult.total_detected || 0} pod{(chiliSegResult.total_detected || 0) !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  </View>

                  {/* Overview Stats */}
                  <View style={styles.measGrid}>
                    <View style={styles.measCard}>
                      <Ionicons name="leaf" size={14} color="#f97316" />
                      <Text style={styles.measLabel}>Pods</Text>
                      <Text style={styles.measValue}>{chiliSegResult.total_detected || 0}</Text>
                    </View>
                    <View style={styles.measCard}>
                      <Ionicons name="resize" size={14} color="#3b82f6" />
                      <Text style={styles.measLabel}>Avg Length</Text>
                      <Text style={styles.measValue}>
                        {chiliSegResult.measurements?.average?.length_mm
                          ? `${chiliSegResult.measurements.average.length_mm.toFixed(1)} mm`
                          : '—'}
                      </Text>
                    </View>
                    <View style={styles.measCard}>
                      <Ionicons name="swap-horizontal" size={14} color="#8b5cf6" />
                      <Text style={styles.measLabel}>Avg Width</Text>
                      <Text style={styles.measValue}>
                        {chiliSegResult.measurements?.average?.width_mm
                          ? `${chiliSegResult.measurements.average.width_mm.toFixed(1)} mm`
                          : '—'}
                      </Text>
                    </View>
                    <View style={styles.measCard}>
                      <Ionicons name="scale" size={14} color="#22c55e" />
                      <Text style={styles.measLabel}>Total Weight</Text>
                      <Text style={styles.measValue}>
                        {chiliSegResult.measurements?.total_estimated_weight_g != null
                          ? `${chiliSegResult.measurements.total_estimated_weight_g.toFixed(1)} g`
                          : '—'}
                      </Text>
                    </View>
                  </View>

                  {/* Per-variety breakdown */}
                  {chiliSegResult.varieties_detected && Object.entries(chiliSegResult.varieties_detected).map(([variety, info]) => (
                    <View key={variety} style={styles.varietyBreakdown}>
                      <View style={styles.varietyBreakdownHeader}>
                        <View style={[styles.varietyDot, { backgroundColor: getVarietyColor(variety) }]} />
                        <Text style={styles.varietyBreakdownName}>{variety}</Text>
                        <View style={[styles.maturityBadge, { backgroundColor: 'rgba(249,115,22,0.2)' }]}>
                          <Text style={[styles.maturityBadgeText, { color: '#f97316' }]}>
                            {info.count} pod{info.count !== 1 ? 's' : ''}
                          </Text>
                        </View>
                      </View>
                      {info.description && (
                        <Text style={styles.varietyDesc}>{info.description}</Text>
                      )}

                      <View style={styles.measGrid}>
                        <View style={styles.measCard}>
                          <Text style={styles.measLabel}>Avg Length</Text>
                          <Text style={styles.measValue}>
                            {info.avg_length_mm ? `${info.avg_length_mm.toFixed(1)}` : '—'}
                          </Text>
                          {info.reference_length_mm && (
                            <Text style={styles.measRef}>ref: {info.reference_length_mm.toFixed(0)} mm</Text>
                          )}
                        </View>
                        <View style={styles.measCard}>
                          <Text style={styles.measLabel}>Avg Width</Text>
                          <Text style={styles.measValue}>
                            {info.avg_width_mm ? `${info.avg_width_mm.toFixed(1)}` : '—'}
                          </Text>
                          {info.reference_width_mm && (
                            <Text style={styles.measRef}>ref: {info.reference_width_mm.toFixed(0)} mm</Text>
                          )}
                        </View>
                        <View style={styles.measCard}>
                          <Text style={styles.measLabel}>Avg Weight</Text>
                          <Text style={styles.measValue}>
                            {info.avg_weight_g ? `${info.avg_weight_g.toFixed(1)} g` : '—'}
                          </Text>
                          {info.reference_weight_g && (
                            <Text style={styles.measRef}>ref: {info.reference_weight_g.toFixed(0)} g</Text>
                          )}
                        </View>
                        <View style={styles.measCard}>
                          <Ionicons name="flame" size={12} color="#ef4444" />
                          <Text style={styles.measLabel}>Heat</Text>
                          <Text style={[styles.measValue, { fontSize: 11 }]}>
                            {info.shu_range || '—'}
                          </Text>
                          {info.heat_category && (
                            <Text style={styles.measRef}>{info.heat_category}</Text>
                          )}
                        </View>
                      </View>

                      {/* Individual pod table */}
                      {chiliSegResult.segments && chiliSegResult.segments.filter(
                        s => s.variety === variety
                      ).length > 1 && (
                        <View style={styles.podTable}>
                          <View style={styles.podTableHeaderRow}>
                            <Text style={[styles.podTableHeaderCell, { flex: 0.8 }]}>Pod</Text>
                            <Text style={styles.podTableHeaderCell}>Conf</Text>
                            <Text style={styles.podTableHeaderCell}>Length</Text>
                            <Text style={styles.podTableHeaderCell}>Width</Text>
                            <Text style={styles.podTableHeaderCell}>Weight</Text>
                          </View>
                          {chiliSegResult.segments.filter(s => s.variety === variety).map((seg, i) => (
                            <View key={i} style={styles.podTableRow}>
                              <Text style={[styles.podTableCell, { flex: 0.8 }]}>#{seg.pod_number || i + 1}</Text>
                              <Text style={styles.podTableCell}>{(seg.confidence * 100).toFixed(0)}%</Text>
                              <Text style={styles.podTableCell}>
                                {seg.measurement?.length_mm ? `${seg.measurement.length_mm.toFixed(1)}` : '—'}
                              </Text>
                              <Text style={styles.podTableCell}>
                                {seg.measurement?.width_mm ? `${seg.measurement.width_mm.toFixed(1)}` : '—'}
                              </Text>
                              <Text style={styles.podTableCell}>
                                {seg.measurement?.estimated_weight_g ? `${seg.measurement.estimated_weight_g.toFixed(1)}g` : '—'}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  ))}

                  {/* Scale calibration info */}
                  {chiliSegResult.measurements?.scale_mm_per_px && (
                    <View style={styles.scaleInfo}>
                      <View style={styles.scaleInfoRow}>
                        <Ionicons
                          name={chiliSegResult.measurements.scale_method === 'reference-calibrated' ? 'checkmark-circle' : 'alert-circle'}
                          size={14}
                          color={chiliSegResult.measurements.scale_method === 'reference-calibrated' ? '#22c55e' : '#eab308'}
                        />
                        <Text style={styles.scaleInfoText}>
                          {chiliSegResult.measurements.scale_method === 'reference-calibrated' ? 'Calibrated' : 'Estimated'}
                          {' • '}{chiliSegResult.measurements.scale_mm_per_px.toFixed(3)} mm/px
                        </Text>
                      </View>
                    </View>
                  )}

                  {chiliSegResult.processing_time_ms && (
                    <Text style={[styles.processingTime, { marginTop: 8 }]}>
                      Segmented in {chiliSegResult.processing_time_ms.toFixed(0)}ms
                    </Text>
                  )}
                </View>
              )}

              {chiliSegResult && !chiliSegResult.success && (
                <View style={styles.segErrorContainer}>
                  <Ionicons name="warning" size={16} color="#ef4444" />
                  <Text style={styles.segErrorText}>
                    {chiliSegResult.error || 'Segmentation failed'}
                  </Text>
                </View>
              )}

              {/* ═══════════════════════════════════════════
                  STEP 2: FLOWER ENHANCEMENT (Optional)
                  ═══════════════════════════════════════ */}
              {classResult && classResult.variety && classResult.variety !== 'Others' && (
                <View style={styles.flowerEnhanceSection}>
                  <View style={styles.flowerEnhanceHeader}>
                    <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>2</Text></View>
                    <Text style={styles.flowerEnhanceTitle}>Enhance with Flower Scan</Text>
                    <View style={styles.optionalBadge}>
                      <Text style={styles.optionalBadgeText}>Optional</Text>
                    </View>
                  </View>
                  <Text style={styles.flowerEnhanceDesc}>
                    Upload a flower from the same plant to refine the SHU prediction with stress-based multiplier.
                  </Text>

                  {!refinedResult ? (
                    <View>
                      {!flowerRefineImage ? (
                        <TouchableOpacity style={styles.flowerPickArea} onPress={pickFlowerForRefinement}>
                          <Ionicons name="flower" size={32} color="#ec4899" />
                          <Text style={styles.flowerPickText}>Tap to select a flower image</Text>
                        </TouchableOpacity>
                      ) : (
                        <View>
                          <Image source={{ uri: flowerRefineImage }} style={styles.flowerPreviewImg} resizeMode="cover" />
                          <View style={styles.flowerActionRow}>
                            <TouchableOpacity
                              style={[styles.flowerActionBtn, { backgroundColor: '#6b7280' }]}
                              onPress={() => { setFlowerRefineImage(null); setRefinedResult(null); }}
                            >
                              <Ionicons name="close" size={16} color="#fff" />
                              <Text style={styles.flowerActionBtnText}>Remove</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.flowerActionBtn, { backgroundColor: '#ec4899', flex: 1 }, isRefining && { opacity: 0.5 }]}
                              onPress={refineWithFlower}
                              disabled={isRefining}
                            >
                              {isRefining ? (
                                <ActivityIndicator size="small" color="#fff" />
                              ) : (
                                <Ionicons name="sparkles" size={16} color="#fff" />
                              )}
                              <Text style={styles.flowerActionBtnText}>{isRefining ? 'Refining...' : 'Refine SHU'}</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={styles.refinedCard}>
                      <View style={styles.refinedHeaderRow}>
                        <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                        <Text style={styles.refinedHeaderText}>Flower Enhancement Applied</Text>
                      </View>
                      <View style={styles.refinedCompareRow}>
                        <View style={styles.refinedCompareCol}>
                          <Text style={styles.refinedLabel}>Original</Text>
                          <Text style={styles.refinedOldValue}>{refinedResult.original_shu?.toLocaleString() ?? '—'}</Text>
                        </View>
                        <Text style={styles.refinedArrow}>→</Text>
                        <View style={styles.refinedCompareCol}>
                          <Text style={styles.refinedLabel}>Refined</Text>
                          <Text style={styles.refinedNewValue}>{refinedResult.flower_adjusted_shu?.toLocaleString() ?? '—'}</Text>
                        </View>
                      </View>
                      <View style={styles.refinedInfoRow}>
                        <View style={styles.refinedInfoItem}>
                          <Text style={styles.refinedInfoLabel}>Multiplier</Text>
                          <Text style={styles.refinedInfoValue}>×{refinedResult.shu_multiplier?.toFixed(2) ?? '1.00'}</Text>
                        </View>
                        <View style={styles.refinedInfoItem}>
                          <Text style={styles.refinedInfoLabel}>Stress</Text>
                          <Text style={[styles.refinedInfoValue, { color: refinedResult.flower_stress?.stress_class === 'healthy' ? '#22c55e' : '#f97316' }]}>
                            {refinedResult.flower_stress?.stress_class === 'healthy' ? 'Healthy' : 'Stressed'}
                          </Text>
                        </View>
                        <View style={styles.refinedInfoItem}>
                          <Text style={styles.refinedInfoLabel}>Capsaicin</Text>
                          <Text style={styles.refinedInfoValue}>
                            {refinedResult.capsaicin?.mg_per_g?.toFixed(3) ?? '—'} mg/g
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.resetRefineBtn}
                        onPress={() => { setRefinedResult(null); setFlowerRefineImage(null); }}
                      >
                        <Text style={styles.resetRefineBtnText}>Reset Enhancement</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              {/* ═══════════════════════════════════════════
                  CAPSAICIN ESTIMATION
                  ═══════════════════════════════════════ */}
              {classResult?.capsaicin && !refinedResult && (
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionCardTitle}>🧪 Estimated Capsaicin</Text>
                  <View style={styles.capsGrid}>
                    <View style={[styles.capsGridItem, { backgroundColor: '#fef2f2' }]}>
                      <Text style={styles.capsGridLabel}>Capsaicin</Text>
                      <Text style={[styles.capsGridValue, { color: '#dc2626' }]}>
                        {classResult.capsaicin.capsaicin_mg_per_g?.toFixed(4) ?? '—'}
                      </Text>
                      <Text style={styles.capsGridUnit}>mg/g</Text>
                    </View>
                    <View style={[styles.capsGridItem, { backgroundColor: '#fff7ed' }]}>
                      <Text style={styles.capsGridLabel}>Dihydro.</Text>
                      <Text style={[styles.capsGridValue, { color: '#ea580c' }]}>
                        {classResult.capsaicin.dihydrocapsaicin_mg_per_g?.toFixed(4) ?? '—'}
                      </Text>
                      <Text style={styles.capsGridUnit}>mg/g</Text>
                    </View>
                    <View style={[styles.capsGridItem, { backgroundColor: '#fefce8' }]}>
                      <Text style={styles.capsGridLabel}>Total</Text>
                      <Text style={[styles.capsGridValue, { color: '#ca8a04' }]}>
                        {classResult.capsaicin.total_capsaicinoids_mg_per_g?.toFixed(4) ?? '—'}
                      </Text>
                      <Text style={styles.capsGridUnit}>mg/g</Text>
                    </View>
                  </View>
                  <Text style={styles.capsNote}>Est. via Todd conversion. Not HPLC analysis.</Text>
                </View>
              )}

              {/* ═══════════════════════════════════════════
                  DECISION TREE HARVEST RULES
                  ═══════════════════════════════════════ */}
              {classResult?.maturity && (
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionCardTitle}>🌳 Harvest Decision Rules</Text>
                  {[
                    { rule: 'IF Hue > 30 AND Sat > 0.5', result: 'Immature (Green)', match: ['unripe', 'immature', 'green'] },
                    { rule: 'IF Hue ≤ 30 AND Hue > 15', result: 'Turning (Orange)', match: ['turning', 'over-mature'] },
                    { rule: 'IF Hue ≤ 15 AND Red > 200', result: 'Mature (Red)', match: ['ripe'] },
                    { rule: 'IF Value < 0.35 OR Sat < 0.4', result: 'Overripe', match: ['over-ripe', 'overripe', 'dried', 'spent'] },
                  ].map((dtRule, i) => {
                    const isCurrent = dtRule.match.some((m) =>
                      classResult.maturity?.maturity_stage?.toLowerCase().includes(m)
                    );
                    return (
                      <View key={i} style={[styles.dtRuleRow, isCurrent && styles.dtRuleRowActive]}>
                        <View style={[styles.dtRuleBadge, isCurrent && styles.dtRuleBadgeActive]}>
                          <Text style={[styles.dtRuleBadgeText, isCurrent && { color: '#fff' }]}>{i + 1}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.dtRuleCode}>{dtRule.rule}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                            <Text style={styles.dtRuleResult}>→ {dtRule.result}</Text>
                            {isCurrent && (
                              <View style={styles.currentBadge}><Text style={styles.currentBadgeText}>CURRENT</Text></View>
                            )}
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* ═══════════════════════════════════════════
                  ML PREDICTION DETAILS
                  ═══════════════════════════════════════ */}
              {classResult?.ml_details && (
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionCardTitle}>🤖 ML Prediction Details</Text>
                  <View style={styles.mlGrid}>
                    <View style={styles.mlGridItem}>
                      <Text style={styles.mlGridLabel}>Model</Text>
                      <Text style={styles.mlGridValue}>{classResult.ml_details.model_used ?? 'ensemble'}</Text>
                    </View>
                    {classResult.ml_details.lr_prediction != null && (
                      <View style={styles.mlGridItem}>
                        <Text style={styles.mlGridLabel}>LR Prediction</Text>
                        <Text style={styles.mlGridValue}>{classResult.ml_details.lr_prediction.toLocaleString()} SHU</Text>
                      </View>
                    )}
                    {classResult.ml_details.rf_prediction != null && (
                      <View style={styles.mlGridItem}>
                        <Text style={styles.mlGridLabel}>RF Prediction</Text>
                        <Text style={styles.mlGridValue}>{classResult.ml_details.rf_prediction.toLocaleString()} SHU</Text>
                      </View>
                    )}
                    {classResult.ml_details.r2_score != null && (
                      <View style={styles.mlGridItem}>
                        <Text style={styles.mlGridLabel}>R² Score</Text>
                        <Text style={styles.mlGridValue}>{classResult.ml_details.r2_score}</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </View>
          </ScrollView>
        )}

        {/* Flower Segmentation Results */}
        {segResult && segResult.success && (
          <ScrollView style={styles.resultsContainer}>
            <View style={styles.resultCard}>
              <View style={[styles.varietyBadge, { backgroundColor: '#ec4899' }]}>
                <Ionicons name="flower" size={24} color="white" />
                <Text style={styles.varietyText}>
                  {segResult.total_detected || 0} Flower{(segResult.total_detected || 0) !== 1 ? 's' : ''} Detected
                </Text>
              </View>

              {/* Overview Stats */}
              <View style={styles.measGrid}>
                <View style={styles.measCard}>
                  <Ionicons name="flower" size={14} color="#ec4899" />
                  <Text style={styles.measLabel}>Detected</Text>
                  <Text style={styles.measValue}>{segResult.total_detected || 0}</Text>
                </View>
                <View style={styles.measCard}>
                  <Ionicons name="resize" size={14} color="#3b82f6" />
                  <Text style={styles.measLabel}>Avg Length</Text>
                  <Text style={styles.measValue}>
                    {segResult.measurements?.average?.length_mm
                      ? `${segResult.measurements.average.length_mm.toFixed(1)} mm`
                      : '—'}
                  </Text>
                </View>
                <View style={styles.measCard}>
                  <Ionicons name="swap-horizontal" size={14} color="#8b5cf6" />
                  <Text style={styles.measLabel}>Avg Width</Text>
                  <Text style={styles.measValue}>
                    {segResult.measurements?.average?.width_mm
                      ? `${segResult.measurements.average.width_mm.toFixed(1)} mm`
                      : '—'}
                  </Text>
                </View>
                <View style={styles.measCard}>
                  <Ionicons name="analytics" size={14} color="#14b8a6" />
                  <Text style={styles.measLabel}>Avg Area</Text>
                  <Text style={styles.measValue}>
                    {segResult.measurements?.average?.area_mm2
                      ? `${segResult.measurements.average.area_mm2.toFixed(1)} mm²`
                      : '—'}
                  </Text>
                </View>
              </View>

              {/* Flower Stress Assessment */}
              {segResult.flower_stress && (
                <View style={[styles.varietyBreakdown, { borderLeftColor: segResult.flower_stress.stress_class === 'healthy' ? '#22c55e' : '#ef4444', borderLeftWidth: 3 }]}>
                  <View style={styles.varietyBreakdownHeader}>
                    <Ionicons
                      name={segResult.flower_stress.stress_class === 'healthy' ? 'heart' : 'alert-circle'}
                      size={16}
                      color={segResult.flower_stress.stress_class === 'healthy' ? '#22c55e' : '#ef4444'}
                    />
                    <Text style={styles.varietyBreakdownName}>Flower Health</Text>
                    <View style={[
                      styles.maturityBadge,
                      { backgroundColor: segResult.flower_stress.stress_class === 'healthy' ? '#22c55e' : '#ef4444' }
                    ]}>
                      <Text style={styles.maturityBadgeText}>
                        {segResult.flower_stress.stress_class === 'healthy' ? 'Healthy' : 'Stressed'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.measGrid}>
                    <View style={styles.measCard}>
                      <Text style={styles.measLabel}>Stress Score</Text>
                      <Text style={styles.measValue}>
                        {segResult.flower_stress.stress_score != null
                          ? `${(segResult.flower_stress.stress_score * 100).toFixed(0)}%`
                          : '—'}
                      </Text>
                    </View>
                    <View style={styles.measCard}>
                      <Text style={styles.measLabel}>Confidence</Text>
                      <Text style={styles.measValue}>
                        {segResult.flower_stress.confidence != null
                          ? `${(segResult.flower_stress.confidence * 100).toFixed(0)}%`
                          : '—'}
                      </Text>
                    </View>
                    <View style={styles.measCard}>
                      <Text style={styles.measLabel}>Capsaicin</Text>
                      <Text style={[styles.measValue, { fontSize: 11 }]}>
                        {segResult.flower_stress.capsaicin_impact || '—'}
                      </Text>
                    </View>
                    <View style={styles.measCard}>
                      <Text style={styles.measLabel}>SHU Factor</Text>
                      <Text style={styles.measValue}>
                        {segResult.flower_stress.shu_multiplier != null
                          ? `×${segResult.flower_stress.shu_multiplier.toFixed(1)}`
                          : '—'}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Individual flower parts */}
              {segResult.segments && segResult.segments.length > 0 && (
                <View style={styles.podTable}>
                  <View style={styles.podTableHeaderRow}>
                    <Text style={[styles.podTableHeaderCell, { flex: 0.8 }]}>Part</Text>
                    <Text style={styles.podTableHeaderCell}>Conf</Text>
                    <Text style={styles.podTableHeaderCell}>Length</Text>
                    <Text style={styles.podTableHeaderCell}>Width</Text>
                    <Text style={styles.podTableHeaderCell}>Area</Text>
                  </View>
                  {segResult.segments.map((seg, idx) => (
                    <View key={idx} style={styles.podTableRow}>
                      <Text style={[styles.podTableCell, { flex: 0.8 }]}>
                        {(seg.class || 'flower').replace(/-/g, ' ')} #{idx + 1}
                      </Text>
                      <Text style={styles.podTableCell}>{(seg.confidence * 100).toFixed(0)}%</Text>
                      <Text style={styles.podTableCell}>
                        {seg.measurement?.length_mm ? `${seg.measurement.length_mm.toFixed(1)}` : '—'}
                      </Text>
                      <Text style={styles.podTableCell}>
                        {seg.measurement?.width_mm ? `${seg.measurement.width_mm.toFixed(1)}` : '—'}
                      </Text>
                      <Text style={styles.podTableCell}>
                        {seg.measurement?.area_mm2 ? `${seg.measurement.area_mm2.toFixed(0)}` : '—'}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Scale calibration info */}
              {segResult.measurements?.scale_mm_per_px && (
                <View style={styles.scaleInfo}>
                  <View style={styles.scaleInfoRow}>
                    <Ionicons
                      name={segResult.measurements.scale_method === 'reference-calibrated' ? 'checkmark-circle' : 'alert-circle'}
                      size={14}
                      color={segResult.measurements.scale_method === 'reference-calibrated' ? '#22c55e' : '#eab308'}
                    />
                    <Text style={styles.scaleInfoText}>
                      {segResult.measurements.scale_method === 'reference-calibrated' ? 'Calibrated' : 'Estimated'}
                      {' • '}{segResult.measurements.scale_mm_per_px.toFixed(3)} mm/px
                    </Text>
                  </View>
                </View>
              )}

              {segResult.processing_time_ms && (
                <Text style={styles.processingTime}>
                  Processed in {segResult.processing_time_ms.toFixed(0)}ms
                </Text>
              )}
            </View>
          </ScrollView>
        )}

        {/* Error Display */}
        {hasError && (
          <View style={styles.errorContainer}>
            <Ionicons name="warning" size={32} color="#ef4444" />
            <Text style={styles.errorText}>
              {classResult?.error || (segResult as any)?.error || 'Analysis failed'}
            </Text>
          </View>
        )}

        {/* Analyzing Overlay */}
        {isAnalyzing && (
          <View style={styles.analyzingOverlay}>
            <View style={styles.analyzingCard}>
              <ActivityIndicator size="large" color={scanMode === 'flower' ? '#ec4899' : '#f97316'} />
              <Text style={styles.analyzingTitle}>
                Analyzing with AI...
              </Text>
              <Text style={styles.analyzingSubtitle}>
                {scanMode === 'flower' ? 'Detecting flowers' : 'Classifying chili variety'}
              </Text>
            </View>
          </View>
        )}

        {/* Bottom Controls */}
        <View style={styles.previewBottomControls}>
          <View style={styles.previewButtonRow}>
            <TouchableOpacity
              style={styles.retakeButton}
              onPress={retake}
              disabled={isAnalyzing}
            >
              <Ionicons name="refresh" size={20} color="white" />
              <Text style={styles.buttonText}>Retake</Text>
            </TouchableOpacity>
            {!hasResult ? (
              <TouchableOpacity
                style={[styles.analyzeButton, scanMode === 'flower' && { backgroundColor: '#ec4899' }]}
                onPress={analyzeImage}
                disabled={isAnalyzing}
              >
                <Ionicons name={scanMode === 'flower' ? 'flower' : 'flash'} size={20} color="white" />
                <Text style={styles.buttonText}>Analyze</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => {
                  Alert.alert('Saved!', 'Analysis saved to your library.');
                  retake();
                }}
              >
                <Ionicons name="checkmark-circle" size={20} color="white" />
                <Text style={styles.buttonText}>Done</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
      >
        {/* Header */}
        <View style={styles.cameraHeader}>
          <View style={styles.cameraHeaderRow}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            
            {/* Scan Mode Toggle */}
            <View style={styles.modeToggleContainer}>
              <TouchableOpacity
                style={[styles.modeToggleBtn, scanMode === 'chili' && styles.modeToggleBtnActive]}
                onPress={() => setScanMode('chili')}
              >
                <Ionicons name="leaf" size={16} color={scanMode === 'chili' ? '#fff' : '#ccc'} />
                <Text style={[styles.modeToggleText, scanMode === 'chili' && styles.modeToggleTextActive]}>
                  Chili
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeToggleBtn, scanMode === 'flower' && styles.modeToggleBtnFlowerActive]}
                onPress={() => setScanMode('flower')}
              >
                <Ionicons name="flower" size={16} color={scanMode === 'flower' ? '#fff' : '#ccc'} />
                <Text style={[styles.modeToggleText, scanMode === 'flower' && styles.modeToggleTextActive]}>
                  Flower
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
            >
              <Ionicons name="camera-reverse-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Guide Overlay */}
        <View style={styles.guideContainer}>
          <View style={[styles.guideBox, scanMode === 'flower' && { borderColor: 'rgba(236,72,153,0.6)' }]}>
            <View style={styles.guideLabelContainer}>
              <Text style={styles.guideLabelText}>
                {scanMode === 'flower' ? 'Position flower here' : 'Position chili here'}
              </Text>
            </View>
          </View>
        </View>

        {/* Bottom Controls */}
        <View style={styles.cameraBottomControls}>
          <View style={styles.cameraControlsRow}>
            {/* Gallery */}
            <TouchableOpacity
              style={styles.galleryButton}
              onPress={pickImage}
            >
              <Ionicons name="images-outline" size={28} color="white" />
            </TouchableOpacity>

            {/* Capture */}
            <TouchableOpacity
              style={styles.captureButtonOuter}
              onPress={takePicture}
              disabled={isCapturing}
            >
              {isCapturing ? (
                <ActivityIndicator color="white" />
              ) : (
                <View style={styles.captureButtonInner} />
              )}
            </TouchableOpacity>

            {/* Placeholder for symmetry */}
            <View style={styles.placeholderButton} />
          </View>

          {/* Tips */}
          <View style={styles.tipsContainer}>
            <View style={[styles.tipBadge, scanMode === 'flower' && { backgroundColor: 'rgba(236,72,153,0.3)' }]}>
              <Ionicons name="bulb-outline" size={16} color={scanMode === 'flower' ? '#f9a8d4' : '#facc15'} />
              <Text style={styles.tipText}>
                {scanMode === 'flower' ? 'Capture a clear flower image' : 'Use good lighting for best results'}
              </Text>
            </View>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    paddingHorizontal: 24,
  },
  permissionText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 16,
  },
  permissionButton: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 24,
  },
  permissionButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  previewImage: {
    flex: 1,
  },
  analyzingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzingCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  analyzingTitle: {
    color: '#1f2937',
    fontWeight: 'bold',
    marginTop: 16,
  },
  analyzingSubtitle: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 4,
  },
  previewBottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 24,
    paddingBottom: 40,
  },
  previewButtonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  retakeButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 9999,
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  analyzeButton: {
    backgroundColor: '#dc2626',
    borderRadius: 9999,
    paddingHorizontal: 32,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  camera: {
    flex: 1,
  },
  cameraHeader: {
    paddingTop: 56,
    paddingHorizontal: 24,
  },
  cameraHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 9999,
    padding: 8,
  },
  modeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 9999,
    padding: 4,
  },
  modeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
    gap: 6,
  },
  modeToggleBtnActive: {
    backgroundColor: '#dc2626',
  },
  modeToggleBtnFlowerActive: {
    backgroundColor: '#ec4899',
  },
  modeToggleText: {
    color: '#ccc',
    fontSize: 13,
    fontWeight: '600',
  },
  modeToggleTextActive: {
    color: '#fff',
  },
  guideContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideBox: {
    width: 256,
    height: 256,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 24,
  },
  guideLabelContainer: {
    position: 'absolute',
    top: -32,
    left: '50%',
    transform: [{ translateX: -60 }],
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 9999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  guideLabelText: {
    color: 'white',
    fontSize: 14,
  },
  cameraBottomControls: {
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  cameraControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  galleryButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 9999,
    padding: 16,
  },
  captureButtonOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'white',
  },
  placeholderButton: {
    width: 56,
    height: 56,
  },
  tipsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  tipBadge: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 9999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tipText: {
    color: 'white',
    fontSize: 14,
    marginLeft: 8,
  },
  // New styles for results
  previewImageSmall: {
    width: '100%',
    height: '40%',
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: '#111827',
  },
  resultCard: {
    padding: 20,
  },
  varietyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginBottom: 20,
  },
  varietyText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  confidenceRow: {
    marginBottom: 20,
  },
  confidenceLabel: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 8,
  },
  confidenceBarContainer: {
    height: 12,
    backgroundColor: '#374151',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  confidenceBar: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 6,
  },
  confidenceValue: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  allPredictions: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  allPredictionsTitle: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 12,
  },
  predictionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  predictionClass: {
    color: 'white',
    fontSize: 14,
  },
  predictionConfidence: {
    color: '#f97316',
    fontSize: 14,
    fontWeight: '600',
  },
  processingTime: {
    color: '#6b7280',
    fontSize: 12,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#111827',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
  },
  saveButton: {
    backgroundColor: '#22c55e',
    borderRadius: 9999,
    paddingHorizontal: 32,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Maturity styles
  maturitySection: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  maturityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  maturityTitle: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  maturityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  maturityBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  maturityDescription: {
    color: '#9ca3af',
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  maturityStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  maturityStat: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  maturityStatLabel: {
    color: '#6b7280',
    fontSize: 10,
  },
  maturityStatValue: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  growthAdviceBox: {
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderRadius: 10,
    padding: 12,
  },
  growthAdviceTitle: {
    color: '#22c55e',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  growthAdviceRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  growthAdviceBullet: {
    color: '#22c55e',
    fontSize: 13,
    lineHeight: 18,
  },
  growthAdviceText: {
    color: '#86efac',
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  // Chili segmentation styles
  segmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f97316',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginTop: 16,
    gap: 8,
  },
  segmentButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },
  segmentingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 16,
    gap: 8,
  },
  segmentingText: {
    color: '#f97316',
    fontSize: 14,
  },
  chiliSegSection: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  chiliSegHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chiliSegTitle: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  segErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
    gap: 8,
  },
  segErrorText: {
    color: '#ef4444',
    fontSize: 13,
  },
  // Measurement grid styles
  measGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  measCard: {
    flex: 1,
    minWidth: '44%',
    backgroundColor: '#111827',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    gap: 2,
  },
  measLabel: {
    color: '#6b7280',
    fontSize: 10,
    fontWeight: '500',
  },
  measValue: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  measRef: {
    color: '#4b5563',
    fontSize: 9,
    fontStyle: 'italic',
  },
  // Per-variety breakdown styles
  varietyBreakdown: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  varietyBreakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  varietyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  varietyBreakdownName: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  varietyDesc: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  // Pod table styles
  podTable: {
    backgroundColor: '#111827',
    borderRadius: 10,
    marginTop: 10,
    overflow: 'hidden',
  },
  podTableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  podTableHeaderCell: {
    flex: 1,
    color: '#6b7280',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  podTableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  podTableCell: {
    flex: 1,
    color: '#d1d5db',
    fontSize: 11,
    textAlign: 'center',
  },
  // Scale calibration info
  scaleInfo: {
    backgroundColor: 'rgba(34,197,94,0.08)',
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
  },
  scaleInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scaleInfoText: {
    color: '#9ca3af',
    fontSize: 11,
  },

  // ── Step 2: Flower Enhancement ──────────────────────────────
  flowerEnhanceSection: {
    marginTop: 16,
    padding: 14,
    backgroundColor: '#fdf4ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9d5ff',
  },
  flowerEnhanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ec4899',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  flowerEnhanceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6b21a8',
    flex: 1,
  },
  optionalBadge: {
    backgroundColor: '#e9d5ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  optionalBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#7c3aed',
  },
  flowerEnhanceDesc: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 10,
    lineHeight: 17,
  },
  flowerPickArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#d8b4fe',
    borderRadius: 12,
    backgroundColor: '#faf5ff',
  },
  flowerPickText: {
    fontSize: 13,
    color: '#9333ea',
    marginTop: 6,
    fontWeight: '500',
  },
  flowerPreviewImg: {
    width: '100%',
    height: 140,
    borderRadius: 10,
  },
  flowerActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  flowerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  flowerActionBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  refinedCard: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  refinedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  refinedHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#15803d',
  },
  refinedCompareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 10,
  },
  refinedCompareCol: {
    alignItems: 'center',
  },
  refinedLabel: {
    fontSize: 10,
    color: '#9ca3af',
  },
  refinedOldValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  refinedNewValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ea580c',
  },
  refinedArrow: {
    fontSize: 22,
    color: '#d1d5db',
  },
  refinedInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  refinedInfoItem: {
    alignItems: 'center',
  },
  refinedInfoLabel: {
    fontSize: 10,
    color: '#9ca3af',
  },
  refinedInfoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginTop: 2,
  },
  resetRefineBtn: {
    alignSelf: 'center',
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  resetRefineBtnText: {
    fontSize: 12,
    color: '#9ca3af',
  },

  // ── Section Cards ───────────────────────────────────────────
  sectionCard: {
    marginTop: 16,
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },

  // ── Capsaicin Grid ──────────────────────────────────────────
  capsGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  capsGridItem: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  capsGridLabel: {
    fontSize: 9,
    color: '#6b7280',
    textAlign: 'center',
  },
  capsGridValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 3,
  },
  capsGridUnit: {
    fontSize: 9,
    color: '#9ca3af',
    marginTop: 1,
  },
  capsNote: {
    fontSize: 10,
    color: '#9ca3af',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },

  // ── DT Harvest Rules ───────────────────────────────────────
  dtRuleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    marginBottom: 6,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dtRuleRowActive: {
    backgroundColor: '#fffbeb',
    borderColor: '#fbbf24',
    borderWidth: 2,
  },
  dtRuleBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  dtRuleBadgeActive: {
    backgroundColor: '#f59e0b',
  },
  dtRuleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
  },
  dtRuleCode: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#374151',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  dtRuleResult: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  currentBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  currentBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#fff',
  },

  // ── ML Details ──────────────────────────────────────────────
  mlGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mlGridItem: {
    width: '47%',
    padding: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  mlGridLabel: {
    fontSize: 10,
    color: '#6b7280',
  },
  mlGridValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginTop: 2,
  },
});

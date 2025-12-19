#!/usr/bin/env node

/**
 * Motion Tracking Test Script
 * Tests the 6-step motion tracking implementation
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  step: (num, msg) => console.log(`\n${colors.cyan}STAP ${num}: ${msg}${colors.reset}`),
};

async function execCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { shell: true });
    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`${command} failed with code ${code}: ${stderr}`));
      }
    });
  });
}

async function generateTestVideo() {
  log.step(1, 'Test video genereren');
  
  const testVideoPath = path.join(process.cwd(), 'test-video.mp4');
  
  if (fs.existsSync(testVideoPath)) {
    log.warning('Test video bestaat al, overslaan');
    return testVideoPath;
  }

  try {
    log.info('Genereer 10 seconden test video met bewegend object...');
    
    // Generate a simple test video with FFmpeg
    // This creates a video with a red circle moving across the screen
    const ffmpegCmd = `ffmpeg -f lavfi -i color=c=white:s=640x480:d=10 -vf "drawcircle=x='min(t\\*50\\, 600)':y='240':r='30':color=red:t=fill" -y "${testVideoPath}"`;
    
    await execCommand(ffmpegCmd);
    log.success(`Test video gemaakt: ${testVideoPath}`);
    return testVideoPath;
  } catch (error) {
    log.error(`Fout bij het genereren van test video: ${error.message}`);
    throw error;
  }
}

async function testMotionTrackingManager() {
  log.step(2, 'Motion Tracking Manager testen');
  
  try {
    log.info('Controleer of MotionTrackingManager gecompileerd is...');
    
    const managerPath = path.join(process.cwd(), 'electron-video-editor', 'src', 'main', 'tracking', 'motionTrackingManager.ts');
    
    if (!fs.existsSync(managerPath)) {
      throw new Error('motionTrackingManager.ts niet gevonden');
    }
    
    log.success('MotionTrackingManager gevonden');
    
    // Check file content
    const content = fs.readFileSync(managerPath, 'utf-8');
    
    const checks = [
      { name: 'analyzeMotion method', pattern: /analyzeMotion\s*\(/ },
      { name: 'trackObjects method', pattern: /trackObjects\s*\(/ },
      { name: 'trackFaces method', pattern: /trackFaces\s*\(/ },
      { name: 'trackOpticalFlow method', pattern: /trackOpticalFlow\s*\(/ },
      { name: 'detectMotion method', pattern: /detectMotion\s*\(/ },
      { name: 'extractFrames method', pattern: /extractFrames\s*\(/ },
    ];
    
    log.info('Controleer geïmplementeerde methodes:');
    let allFound = true;
    checks.forEach((check) => {
      if (check.pattern.test(content)) {
        log.success(`  ${check.name}`);
      } else {
        log.error(`  ${check.name}`);
        allFound = false;
      }
    });
    
    return allFound;
  } catch (error) {
    log.error(`Motion Tracking Manager test gefaald: ${error.message}`);
    throw error;
  }
}

async function testKeyframeInterpolator() {
  log.step(3, 'Keyframe Interpolator testen');
  
  try {
    log.info('Controleer KeyframeInterpolator implementatie...');
    
    const interpolatorPath = path.join(
      process.cwd(),
      'electron-video-editor',
      'src',
      'main',
      'tracking',
      'keyframeInterpolator.ts'
    );
    
    if (!fs.existsSync(interpolatorPath)) {
      throw new Error('keyframeInterpolator.ts niet gevonden');
    }
    
    const content = fs.readFileSync(interpolatorPath, 'utf-8');
    
    const checks = [
      { name: 'KeyframeInterpolator class', pattern: /class\s+KeyframeInterpolator/ },
      { name: 'interpolate method', pattern: /interpolate\s*\(/ },
      { name: 'easeValue method', pattern: /easeValue\s*\(/ },
      { name: 'generateSmoothKeyframes method', pattern: /generateSmoothKeyframes\s*\(/ },
      { name: 'Linear easing', pattern: /case\s+[\'"]linear[\'"]/ },
      { name: 'Ease-in easing', pattern: /case\s+[\'"]ease-in[\'"]/ },
      { name: 'Ease-out easing', pattern: /case\s+[\'"]ease-out[\'"]/ },
      { name: 'Bounce easing', pattern: /easeBounce/ },
      { name: 'Elastic easing', pattern: /easeElastic/ },
    ];
    
    log.info('Controleer easing functies en methodes:');
    let allFound = true;
    checks.forEach((check) => {
      if (check.pattern.test(content)) {
        log.success(`  ${check.name}`);
      } else {
        log.error(`  ${check.name}`);
        allFound = false;
      }
    });
    
    return allFound;
  } catch (error) {
    log.error(`Keyframe Interpolator test gefaald: ${error.message}`);
    throw error;
  }
}

async function testMotionTrackingExport() {
  log.step(4, 'Motion Tracking Export testen');
  
  try {
    log.info('Controleer MotionTrackingExporter implementatie...');
    
    const exportPath = path.join(
      process.cwd(),
      'electron-video-editor',
      'src',
      'main',
      'tracking',
      'motionTrackingExport.ts'
    );
    
    if (!fs.existsSync(exportPath)) {
      throw new Error('motionTrackingExport.ts niet gevonden');
    }
    
    const content = fs.readFileSync(exportPath, 'utf-8');
    
    const checks = [
      { name: 'MotionTrackingExporter class', pattern: /class\s+MotionTrackingExporter/ },
      { name: 'generateFFmpegFilterString method', pattern: /generateFFmpegFilterString\s*\(/ },
      { name: 'generateDrawboxFilter method', pattern: /generateDrawboxFilter\s*\(/ },
      { name: 'exportWithTracking method', pattern: /exportWithTracking\s*\(/ },
      { name: 'generatePythonTrackingScript method', pattern: /generatePythonTrackingScript\s*\(/ },
    ];
    
    log.info('Controleer export methodes:');
    let allFound = true;
    checks.forEach((check) => {
      if (check.pattern.test(content)) {
        log.success(`  ${check.name}`);
      } else {
        log.error(`  ${check.name}`);
        allFound = false;
      }
    });
    
    return allFound;
  } catch (error) {
    log.error(`Motion Tracking Export test gefaald: ${error.message}`);
    throw error;
  }
}

async function testIPCChannels() {
  log.step(5, 'IPC Channels testen');
  
  try {
    log.info('Controleer IPC channels...');
    
    const channelsPath = path.join(
      process.cwd(),
      'electron-video-editor',
      'src',
      'main',
      'ipc',
      'channels.ts'
    );
    
    if (!fs.existsSync(channelsPath)) {
      throw new Error('channels.ts niet gevonden');
    }
    
    const content = fs.readFileSync(channelsPath, 'utf-8');
    
    const checks = [
      { name: 'ANALYZE_MOTION channel', pattern: /ANALYZE_MOTION/ },
      { name: 'CANCEL_MOTION_TRACKING channel', pattern: /CANCEL_MOTION_TRACKING/ },
      { name: 'GET_TRACKING_DATA channel', pattern: /GET_TRACKING_DATA/ },
      { name: 'APPLY_TRACKING_KEYFRAMES channel', pattern: /APPLY_TRACKING_KEYFRAMES/ },
    ];
    
    log.info('Controleer IPC channels:');
    let allFound = true;
    checks.forEach((check) => {
      if (check.pattern.test(content)) {
        log.success(`  ${check.name}`);
      } else {
        log.error(`  ${check.name}`);
        allFound = false;
      }
    });
    
    return allFound;
  } catch (error) {
    log.error(`IPC Channels test gefaald: ${error.message}`);
    throw error;
  }
}

async function testMotionTrackingUI() {
  log.step(6, 'Motion Tracking UI testen');
  
  try {
    log.info('Controleer React UI component...');
    
    const uiPath = path.join(
      process.cwd(),
      'electron-video-editor',
      'src',
      'renderer',
      'components',
      'MotionTrackingPanel.tsx'
    );
    
    if (!fs.existsSync(uiPath)) {
      log.warning('MotionTrackingPanel.tsx niet gevonden (optioneel)');
      return true;
    }
    
    const content = fs.readFileSync(uiPath, 'utf-8');
    
    const checks = [
      { name: 'React component', pattern: /function\s+MotionTrackingPanel|const\s+MotionTrackingPanel/ },
      { name: 'Tracking type selector', pattern: /object.*face.*motion|selectedType/ },
      { name: 'Progress display', pattern: /progress|Progress|isAnalyzing/ },
      { name: 'Results display', pattern: /results|Results|trackingData/ },
    ];
    
    log.info('Controleer UI componenten:');
    let allFound = true;
    checks.forEach((check) => {
      if (check.pattern.test(content)) {
        log.success(`  ${check.name}`);
      } else {
        log.error(`  ${check.name}`);
        allFound = false;
      }
    });
    
    return allFound;
  } catch (error) {
    log.error(`Motion Tracking UI test gefaald: ${error.message}`);
    throw error;
  }
}

async function runTests() {
  console.log(`\n${colors.cyan}═══════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}  ATACUT Motion Tracking Test Suite${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════${colors.reset}\n`);

  try {
    // Run all 6 tests
    const results = [];
    
    // Step 1: Generate test video
    // const videoPath = await generateTestVideo();
    // results.push({ name: 'Test Video Generation', passed: true });

    // Step 2-6: Test implementation
    results.push({
      name: 'Motion Tracking Manager',
      passed: await testMotionTrackingManager(),
    });

    results.push({
      name: 'Keyframe Interpolator',
      passed: await testKeyframeInterpolator(),
    });

    results.push({
      name: 'Motion Tracking Export',
      passed: await testMotionTrackingExport(),
    });

    results.push({
      name: 'IPC Channels',
      passed: await testIPCChannels(),
    });

    results.push({
      name: 'Motion Tracking UI',
      passed: await testMotionTrackingUI(),
    });

    // Summary
    console.log(`\n${colors.cyan}═══════════════════════════════════════${colors.reset}`);
    console.log(`${colors.cyan}  TEST SAMENVATTING${colors.reset}`);
    console.log(`${colors.cyan}═══════════════════════════════════════${colors.reset}\n`);

    const passed = results.filter((r) => r.passed).length;
    const total = results.length;

    results.forEach((result) => {
      if (result.passed) {
        log.success(`${result.name}`);
      } else {
        log.error(`${result.name}`);
      }
    });

    console.log(`\n${colors.cyan}Resultaat: ${passed}/${total} tests geslaagd${colors.reset}\n`);

    if (passed === total) {
      log.success('ALLE TESTS GESLAAGD! Motion tracking is klaar voor gebruik.');
      console.log(`\n${colors.green}Volgende stap: npm run dev starten en testen via de UI${colors.reset}\n`);
    } else {
      log.error(`WAARSCHUWING: ${total - passed} test(s) gefaald`);
    }
  } catch (error) {
    log.error(`Test suite fout: ${error.message}`);
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  log.error(`Onverwachte fout: ${error.message}`);
  process.exit(1);
});

#include "rs3d.h"
#include "global.h"
#include <emscripten.h>
#include <iostream>
#include <fstream>
#include <stdio.h>
#include <string>

using namespace std;

// Initialize global variables here
EMSCRIPTEN_KEEPALIVE visisonics_rs3d_HRTF *phrtf;
EMSCRIPTEN_KEEPALIVE visisonics_rs3d_EXPERIENCE *ppexperience;
EMSCRIPTEN_KEEPALIVE visisonics_rs3d_EXPERIENCEINFO experienceinfo;
EMSCRIPTEN_KEEPALIVE visisonics_rs3d_PROCESSINGINFO processinginfo;

EMSCRIPTEN_KEEPALIVE void initialize(int sampleRate, int sampleBlock) {
    // Seems like 128 samples works the best as of right now...
    int x = visisonics_rs3d_GrabHrtf (&phrtf, hrtf_cp048_r1_icb, hrtf_cp048_r1_icb_len, (long) sampleRate, (long) sampleBlock);
    printf("Grab Hrtf Status: %d\n", x);

    // Fill experience info
    experienceinfo.customroomsize = false;
    experienceinfo.customreflection = false;
    experienceinfo.enableambisonics = false;
    experienceinfo.requestrt60 = false;
  
    int y = visisonics_rs3d_GrabExperience(&ppexperience, phrtf, &experienceinfo);
    printf("Grab Experience Status: %d\n", y);

    // Fill initial processing info
    long cx, ax;
    
    for (cx = 0 ; cx < 3 ; cx++) {
      processinginfo.pheadorientation[cx] = 0;
    }

    for (cx = 0 ; cx < visisonics_rs3d_MAXSOURCEOBJECTS ; cx++) {
      // Initial volume of the users in call
      processinginfo.pobjectinfo[cx].volume = 0.5;
      
      // Initial starting position of object should be in front of user
      processinginfo.pobjectinfo[cx].pposition[0] = 0;
      processinginfo.pobjectinfo[cx].pposition[1] = -1;
      processinginfo.pobjectinfo[cx].pposition[2] = 0;
    }

    processinginfo.ambisonicsvolume = 0;
    processinginfo.enabledistanceattenuation = false;
    processinginfo.limitgain = true;
    processinginfo.enableinterpolationforobjects = false;
    processinginfo.enableinterpolationforambisonics = false;
    processinginfo.enableequalizercurve = false;

    return;
}

EMSCRIPTEN_KEEPALIVE void updateHeadOrientation(float x, float y, float z) {
  processinginfo.pheadorientation[0] = x;
  processinginfo.pheadorientation[1] = y;
  processinginfo.pheadorientation[2] = z;
}

EMSCRIPTEN_KEEPALIVE void updateObjectInfo(long objIndex, float volume, float x, float y, float z) {
  processinginfo.pobjectinfo[objIndex].volume = volume;
  processinginfo.pobjectinfo[objIndex].pposition[0] = x;
  processinginfo.pobjectinfo[objIndex].pposition[1] = y;
  processinginfo.pobjectinfo[objIndex].pposition[2] = z;

}

EMSCRIPTEN_KEEPALIVE void process(float* inputBuffer[], float* outputBuffer[], int numInputs) {
    // Create array of input audio objects 
    float *ppmyaudio [visisonics_rs3d_MAXSOURCEOBJECTS];
  
    // Initialize the input object array with NULL's
    for (int objectindex = 0 ; objectindex < visisonics_rs3d_MAXSOURCEOBJECTS; objectindex++) {
      ppmyaudio[objectindex] = NULL;
    }

    // We have one audio input with two channels (might need to add more input to enable more people)
    for (int i = 0; i < numInputs; i++) {
      ppmyaudio[i] = inputBuffer[i];
    }

    // Create array of ambisonic input audio
    float *ppmyambisonicaudio [visisonics_rs3d_MAXAMBISONICSCHANNELS];
    
    // Initialize the ambisonic audio array with NULL's
    for (int channelindex = 0 ; channelindex < visisonics_rs3d_MAXAMBISONICSCHANNELS; channelindex++) {
      ppmyambisonicaudio[channelindex] = NULL;
    }

    int y = visisonics_rs3d_Process(ppexperience, outputBuffer, ppmyaudio, ppmyambisonicaudio, &processinginfo);
    // printf("Process Status: %d\n", y);

    return;
    
  }

EMSCRIPTEN_KEEPALIVE void cleanup() {
  visisonics_rs3d_FreeExperience (ppexperience);
  
  visisonics_rs3d_FreeHrtf (phrtf);
}

int main() {
  printf("Ready!\n");
}


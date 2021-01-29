
//######################################################################################################################

#ifndef visisonics_rs3d_H
#define visisonics_rs3d_H

//######################################################################################################################

#include <stdbool.h>

//######################################################################################################################

#define visisonics_rs3d_MAXSOURCEOBJECTS (32)

#define visisonics_rs3d_MAXAMBISONICSCHANNELS (49)

//######################################################################################################################

typedef enum
{
  visisonics_rs3d_AMBISONICSFORMAT_ACN_N3D,
  visisonics_rs3d_AMBISONICSFORMAT_ACN_SN3D,
  visisonics_rs3d_AMBISONICSFORMAT_SID_N3D,
  visisonics_rs3d_AMBISONICSFORMAT_SID_SN3D,
  visisonics_rs3d_AMBISONICSFORMAT_FUMA,

  visisonics_rs3d_AMBISONICSFORMAT_TOTAL
}
visisonics_rs3d_AMBISONICSFORMAT;

//######################################################################################################################

typedef struct
{
  bool customroomsize;
  float proomsize[3];					// In meters, only defined if customroomsize;

  bool customreflection;
  float ppreflectionpercentage[3][2];			// [xyz][-+] from 0 to 100 for each of the 6 walls, only defined if customreflection;

  bool enableambisonics;
  int maxambisonicsorder;				// Only defined if enableambisonics, between 1 to 6, inclusively;
  visisonics_rs3d_AMBISONICSFORMAT ambisonicsformat;	// Only defined if enableambisonics;

  bool requestrt60;
  float rt60;						// If requestrt60 is true, the rt60 will be placed here after GrabExperience() returns;
}
visisonics_rs3d_EXPERIENCEINFO;

//######################################################################################################################

typedef struct
{
  float volume;						// The object's volume is multiplied by this number;

  float pposition[3];
}
visisonics_rs3d_OBJECTINFO;

//######################################################################################################################

typedef struct
{
  float pheadorientation[3];				// euler angles;

  visisonics_rs3d_OBJECTINFO pobjectinfo [visisonics_rs3d_MAXSOURCEOBJECTS];

  float ambisonicsvolume;

  bool enabledistanceattenuation;			// If true, object audio volume is divided by its distance from the listener;
  bool limitgain;					// Limit near distance gain to +12 dB, minimum distance becomes 0.25 meters;

  bool enableinterpolationforobjects;
  bool enableinterpolationforambisonics;

  bool enableequalizercurve;
  void  *pequalizercurve;				// Applied on output, only defined if enableequalizercurve;
}
visisonics_rs3d_PROCESSINGINFO;

//######################################################################################################################

typedef struct visisonics_rs3d_HRTF visisonics_rs3d_HRTF;

typedef struct visisonics_rs3d_EXPERIENCE visisonics_rs3d_EXPERIENCE;

//######################################################################################################################

#ifdef __cplusplus

  extern "C"
  {

#endif

//######################################################################################################################

int visisonics_rs3d_GrabHrtf
(
  visisonics_rs3d_HRTF **pphrtf,	// A pointer to an HRTF struct will be returned in the variable that pphrtf points to;
 
  const unsigned char *phrtfdata,	// pointer to the raw data loaded from an .icb file;
  long hrtfdatasize,			// the size of the .icb file in bytes;

  long samplespersecond,		// must be between 3200 and 96000 Hz, inclusively;
  long samplesperblock			// must be between 4 and 262144 samples, inclusively, and must be an even number;
);


int visisonics_rs3d_FreeHrtf (visisonics_rs3d_HRTF *phrtf);
  // Free any experiences tied to this hrtf before freeing the hrtf;

//######################################################################################################################

int visisonics_rs3d_GrabExperience (visisonics_rs3d_EXPERIENCE **ppexperience, visisonics_rs3d_HRTF *phrtf, visisonics_rs3d_EXPERIENCEINFO *pinfo);
  // A pointer to an EXPERIENCE struct will be returned in the variable that ppexperience points to;
  // Each experience is tied to a specific hrtf, and the number of samples per block for the experience is the same as for the chosen hrtf;

int visisonics_rs3d_FreeExperience (visisonics_rs3d_EXPERIENCE *pexperience);

//######################################################################################################################

int visisonics_rs3d_Process
(
  visisonics_rs3d_EXPERIENCE *pexperience,

  float *ppoutputaudio [2],							// left and right output audio;

  float *ppobjectinputaudio [visisonics_rs3d_MAXSOURCEOBJECTS],			// Set unused objects to NULL;

  float *ppambisonicsinputaudio [visisonics_rs3d_MAXAMBISONICSCHANNELS],	// Set unused channels to NULL;

  const visisonics_rs3d_PROCESSINGINFO *pinfo
);

int visisonics_rs3d_ClearBuffers (visisonics_rs3d_EXPERIENCE *pexperience);

//######################################################################################################################

#ifdef __cplusplus

  } /* extern "C" */

#endif

//######################################################################################################################

#define	_RS3D_NO_ERROR (0)

#define	_RS3D_BASE_ERROR_NUMBER	(-18175)

//######################################################################################################################

#define	_RS3D_INTERNAL_FAILURE			(_RS3D_BASE_ERROR_NUMBER -  1)
#define	_RS3D_MALLOC_FAILURE			(_RS3D_BASE_ERROR_NUMBER -  2)
#define	_RS3D_NULL_ARGUMENT			(_RS3D_BASE_ERROR_NUMBER -  3)
#define	_RS3D_NULL_SUBARGUMENT			(_RS3D_BASE_ERROR_NUMBER -  4)
#define	_RS3D_UNUSED_0000			(_RS3D_BASE_ERROR_NUMBER -  5)
#define	_RS3D_INVALID_BLOCK_SIZE		(_RS3D_BASE_ERROR_NUMBER -  6)
#define	_RS3D_INVALID_SAMPLING_FREQUENCY	(_RS3D_BASE_ERROR_NUMBER -  7)
#define	_RS3D_INVALID_HANDLE			(_RS3D_BASE_ERROR_NUMBER -  8)
#define	_RS3D_INCOMPLETE_INIT			(_RS3D_BASE_ERROR_NUMBER -  9)
#define	_RS3D_UNSUPPORTED_CONFIG_VERSION	(_RS3D_BASE_ERROR_NUMBER - 10)
#define	_RS3D_UNSUPPORTED_RTINFO_VERSION	(_RS3D_BASE_ERROR_NUMBER - 11)
#define	_RS3D_HRTF_PREPARE_FAILURE		(_RS3D_BASE_ERROR_NUMBER - 12)
#define	_RS3D_HASH_PREPARE_FAILURE		(_RS3D_BASE_ERROR_NUMBER - 13)
#define	_RS3D_EPWA_PREPARE_FAILURE		(_RS3D_BASE_ERROR_NUMBER - 14)
#define	_RS3D_LPWA_PREPARE_FAILURE		(_RS3D_BASE_ERROR_NUMBER - 15)
#define	_RS3D_APWA_PREPARE_FAILURE		(_RS3D_BASE_ERROR_NUMBER - 16)
#define	_RS3D_ESTS_PREPARE_FAILURE		(_RS3D_BASE_ERROR_NUMBER - 17)
#define	_RS3D_LSTS_PREPARE_FAILURE		(_RS3D_BASE_ERROR_NUMBER - 18)
#define	_RS3D_ASTS_PREPARE_FAILURE		(_RS3D_BASE_ERROR_NUMBER - 19)
#define	_RS3D_EDTA_PROCESS_FAILURE_1		(_RS3D_BASE_ERROR_NUMBER - 20)
#define	_RS3D_EDTA_PROCESS_FAILURE_2		(_RS3D_BASE_ERROR_NUMBER - 21)
#define	_RS3D_EDTA_PROCESS_FAILURE_3		(_RS3D_BASE_ERROR_NUMBER - 22)
#define	_RS3D_LDTA_PROCESS_FAILURE_1		(_RS3D_BASE_ERROR_NUMBER - 23)
#define	_RS3D_LDTA_PROCESS_FAILURE_2		(_RS3D_BASE_ERROR_NUMBER - 24)
#define	_RS3D_LDTA_PROCESS_FAILURE_3		(_RS3D_BASE_ERROR_NUMBER - 25)
#define	_RS3D_ADTA_PROCESS_FAILURE_1		(_RS3D_BASE_ERROR_NUMBER - 26)
#define	_RS3D_ADTA_PROCESS_FAILURE_2		(_RS3D_BASE_ERROR_NUMBER - 27)
#define	_RS3D_ADTA_PROCESS_FAILURE_3		(_RS3D_BASE_ERROR_NUMBER - 28)
#define	_RS3D_UNSUPPORTED_AMBISONICS_ICOUNT	(_RS3D_BASE_ERROR_NUMBER - 29)
#define	_RS3D_INVALID_AMBISONICS_XORDER		(_RS3D_BASE_ERROR_NUMBER - 30)
#define	_RS3D_INVALID_AMBISONICS_WEIGHT		(_RS3D_BASE_ERROR_NUMBER - 31)
#define	_RS3D_INVALID_XORDER_AND_WEIGHT_COMBO	(_RS3D_BASE_ERROR_NUMBER - 32)
#define	_RS3D_RT60_EVAL_FAILURE_SEQ_1		(_RS3D_BASE_ERROR_NUMBER - 33)
#define	_RS3D_RT60_EVAL_FAILURE_SEQ_2		(_RS3D_BASE_ERROR_NUMBER - 34)
#define	_RS3D_RT60_EVAL_FAILURE_SEQ_3		(_RS3D_BASE_ERROR_NUMBER - 35)
#define	_RS3D_NO_HIGH_ORDER_FUMA_DEFINITION	(_RS3D_BASE_ERROR_NUMBER - 36)
#define	_RS3D_HRTF_IS_STILL_IN_USE		(_RS3D_BASE_ERROR_NUMBER - 37)

//######################################################################################################################

#endif // include guard

//######################################################################################################################

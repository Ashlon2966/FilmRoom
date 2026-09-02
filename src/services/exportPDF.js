import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

export const exportScriptToPDF = async (projectData, scriptText) => {
  try {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          @page {
            size: letter;
            margin: 1in 1in 1in 1.5in; /* Standard Screenplay Margins */
          }
          body {
            font-family: 'Courier Prime', 'Courier New', Courier, monospace;
            font-size: 12pt;
            line-height: 1.1;
            color: #000;
          }
          .title-page {
            page-break-after: always;
            text-align: center;
            padding-top: 3in;
          }
          .title {
            font-size: 24pt;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 20px;
          }
          .meta {
            margin-top: 15px;
            font-size: 12pt;
          }
          .metadata-box {
            text-align: left;
            margin-top: 40px;
            border: 1px solid #333;
            padding: 15px;
            font-size: 11pt;
          }
          .scene-header {
            text-transform: uppercase;
            font-weight: bold;
            margin-top: 24pt;
            margin-bottom: 12pt;
          }
          .action {
            margin-bottom: 12pt;
            width: 100%;
          }
          .character {
            margin-left: 2.0in;
            text-transform: uppercase;
            margin-top: 12pt;
          }
          .dialogue {
            margin-left: 1.0in;
            margin-right: 1.5in;
            margin-bottom: 12pt;
          }
        </style>
      </head>
      <body>
        <!-- Title & Metadata Page -->
        <div class="title-page">
          <div class="title">${projectData.title || 'UNTITLED PROJECT'}</div>
          <div class="meta">Written by</div>
          <div class="meta"><b>${projectData.writer || 'Anonymous'}</b></div>

          <div class="metadata-box">
            <p><b>GENRE:</b> ${projectData.genre || 'N/A'}</p>
            <p><b>LOGLINE:</b> ${projectData.logline || 'N/A'}</p>
            <p><b>SYNOPSIS:</b> ${projectData.synopsis || 'N/A'}</p>
            <p><b>PRODUCTION STAGE:</b> ${projectData.stage || 'Ideation'}</p>
          </div>
        </div>

        <!-- Script Body -->
        <div>
          <pre style="white-space: pre-wrap; font-family: inherit;">${scriptText}</pre>
        </div>
      </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html: htmlContent });
    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
  } catch (error) {
    Alert.alert('PDF Generation Failed', error.message);
  }
};
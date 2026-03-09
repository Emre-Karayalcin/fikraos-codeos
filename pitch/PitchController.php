<?php

namespace App\Http\Controllers;

use App\Models\PitchDeck;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Smalot\PdfParser\Parser as PdfParser;
use PhpOffice\PhpWord\IOFactory as WordIOFactory;
use PhpOffice\PhpPresentation\IOFactory as PresentationIOFactory;
use PhpOffice\PhpSpreadsheet\IOFactory as SpreadsheetIOFactory;

class PitchController extends Controller
{
    public function extractContentFromFile($file)
    {
        $extension = $file->getClientOriginalExtension();
        $content = '';
    
        if ($extension === 'pdf') {
            $parser = new PdfParser();
            $pdf = $parser->parseFile($file->getPathname());
            $content = $pdf->getText();
        } elseif ($extension === 'docx') {
            $phpWord = WordIOFactory::load($file->getPathname());
            foreach ($phpWord->getSections() as $section) {
                foreach ($section->getElements() as $element) {
                    if (method_exists($element, 'getText')) {
                        $content .= $element->getText() . "\n";
                    }
                }
            }
        } elseif ($extension === 'pptx') {
            $pptReader = PresentationIOFactory::createReader('PowerPoint2007');
            $presentation = $pptReader->load($file->getPathname());
    
            foreach ($presentation->getAllSlides() as $slide) {
                foreach ($slide->getShapeCollection() as $shape) {
                    if (method_exists($shape, 'getText')) {
                        $content .= $shape->getText() . "\n";
                    }
                }
            }
        } elseif (in_array($extension, ['xls', 'xlsx'])) {
            $spreadsheet = SpreadsheetIOFactory::load($file->getPathname());
            $worksheet = $spreadsheet->getActiveSheet();
            $rows = $worksheet->toArray();
    
            foreach ($rows as $row) {
                $content .= implode(" | ", $row) . "\n";
            }
        }
    
        return $content;
    }

    
    public function index() {
        $decks = PitchDeck::where('user_id', auth()->id())->where('status', 'SUCCESS')->orderBy('created_at', 'desc')->get();
        return view('panel.user.pitch.index', compact('decks'));
    }

    public function show($id)
    {
        $pitchDeck = PitchDeck::where('user_id', auth()->id())->findOrFail($id);
        return view('panel.user.pitch.show', compact('pitchDeck'));
    }
    
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'plain_text' => 'nullable|string',
            'length' => 'nullable|integer',
            'tone' => 'nullable|string',
            'verbosity' => 'nullable|string',
            'fetch_images' => 'nullable|boolean',
            'include_cover' => 'nullable|boolean',
            'include_table_of_contents' => 'nullable|boolean',
            'template' => 'nullable|string',
            'custom_user_instructions' => 'nullable|string',
            'file' => 'nullable|file|mimes:pdf,docx,pptx,xlsx',
        ]);
    
        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $content = $this->extractContentFromFile($file);
            if (strlen($content) > 3000) {
                $content = substr($content, 0, 2980) . '...';
            }
            $request->merge(['plain_text' => $content]);
        }
    
        $body = $request->only([
            'length', 'tone', 'verbosity', 'fetch_images',
            'include_cover', 'include_table_of_contents',
            'template', 'plain_text', 'custom_user_instructions'
        ]);
        
        $body['language'] = app()->getLocale() == 'ar' ? 'Arabic' : 'English';
    
        $decks_count = PitchDeck::where('user_id', auth()->id())->where('status', 'SUCCESS')->count();
    
        if (!checkUserActiveProplan(auth()->user()) && $decks_count >= 1) {
            return response()->json(['error' => 'You have exceeded the quantity for the free version.'], 500);
        }
    
        $response = Http::withHeaders([
            'Content-Type' => 'application/json',
            'x-api-key' => 'f8ab0ab0-ab14-479d-9882-7f1084368481'
        ])->post('https://api.slidespeak.co/api/v1/presentation/generate', $body);
        
        if (!$response->successful() || !isset($response['task_id'])) {
            return response()->json(['error' => 'Failed to initiate slide generation'], 500);
        }
    
        $pitchDeck = PitchDeck::create([
            'name' => $request->name,
            'task_id' => $response['task_id'] ?? 'test',
            'status' => 'PENDING',
            'user_id' => auth()->id(),
            'options' => $body,
        ]);
    
        return response()->json($pitchDeck, 201);
    }


    public function updateStatus(Request $request, $id)
    {
        $pitchDeck = PitchDeck::where('user_id', auth()->id())->findOrFail($id);
    
        $response = Http::withHeaders([
            'Content-Type' => 'application/json',
            'x-api-key' => 'f8ab0ab0-ab14-479d-9882-7f1084368481'
        ])->get("https://api.slidespeak.co/api/v1/task_status/{$pitchDeck->task_id}");
        
        if (!$response->successful()) {
            return response()->json(['error' => 'Failed to fetch task status'], 500);
        }
    
        $status = $response['task_status'];
        $pptxUrl = '';
        $pdfUrl = null;
    
        if (isset($response) && !empty($response['task_result'])) {
            $pptxUrl = $response['task_result']['url'] ?? null;
        }
    
        $pitchDeck->status = $status;
    
        if ($status === 'SUCCESS' && $pptxUrl && empty($pitchDeck->pdf_url)) {
            $pdfPath = $this->convertPptxToPdf($pptxUrl);
            $pdfUrl = asset('pdfs/' . basename($pdfPath));
            $pitchDeck->pptx_url = $pptxUrl;
            $pitchDeck->pdf_url = $pdfUrl;
            $pitchDeck->save();
        }
    
        return response()->json([
            'id' => $pitchDeck->id,
            'status' => $pitchDeck->status,
            'pptx_url' => $pitchDeck->pptx_url,
            'pdf_url' => $pitchDeck->pdf_url,
        ]);
    }
    
    public function delete($id) {
        $pitchDeck = PitchDeck::where('user_id', auth()->id())->findOrFail($id);
        $pitchDeck->delete();
        return response()->json(['success' => 'Deleted'], 200);
    }

    function convertPptxToPdf($pptxPath)
    {
        require_once base_path('manual-autoload.php');
    
        if (!class_exists('Google\Client') && class_exists('Client')) {
            class_alias('Client', 'Google\Client');
        }
    
        if (!class_exists('Google\Service\Drive') && class_exists('Drive')) {
            class_alias('Drive', 'Google\Service\Drive');
        }
    
        $client = new \Google\Client();
        $client->setAuthConfig(base_path('google-credentials.json'));
        $client->addScope(\Google\Service\Drive::DRIVE);
        $client->setAccessType('offline');
    
        $service = new \Google\Service\Drive($client);
    
        $file = new \Google\Service\Drive\DriveFile([
            'name' => basename($pptxPath),
            'mimeType' => 'application/vnd.google-apps.presentation',
        ]);
    
        $content = file_get_contents($pptxPath);
        $uploadedFile = $service->files->create($file, [
            'data' => $content,
            'mimeType' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'uploadType' => 'multipart',
            'fields' => 'id',
        ]);
    
        $fileId = $uploadedFile->id;
    
        $response = $service->files->export($fileId, 'application/pdf', ['alt' => 'media']);
        $pdfContent = $response->getBody()->getContents();
    
        $filename = 'converted-' . uniqid() . '.pdf';
        $pdfPath = public_path('pdfs/' . $filename);
        
        if (!file_exists(public_path('pdfs'))) {
            mkdir(public_path('pdfs'), 0777, true);
        }
        
        file_put_contents($pdfPath, $pdfContent);
    
        $service->files->delete($fileId);
    
        return $pdfPath;
    }
}

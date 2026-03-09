@extends('panel.layout.app')
@section('title', __(''))
@section('titlebar_actions', '')
@section('titlebar_before', '')
@section('titlebar_pretitle', '')


@section('additional_css')
    <style>
        .lqd-floating-menu-slide {
            display: none !important;
        }
        
        .pdf-slide {
            margin-bottom: 10px;
            cursor: pointer;
            transition: border 0.2s ease;
        }
        .pdf-slide.active-slide {
            border: 2px solid #007bff;
            box-shadow: 0 0 10px rgba(0, 123, 255, 0.5);
        }
        
        .pdf-slide {
            border-radius: 8px;
            overflow: hidden;
            margin-bottom: 10px;
            cursor: pointer;
            box-shadow: 0 2px 6px rgba(0,0,0,0.1);
            transition: transform 0.2s ease;
            width: 100%; /* thumbnail width fits parent container */
            display: block;
        }
        
        .pdf-slide:hover {
            transform: scale(1.03);
        }
        
        #pdfViewer {
            border-radius: 8px;
        }
        
        @media screen and (max-width: 1200px) {
            .pdf-slide {
                margin: 0px!important;
                flex-shrink: 0;
            }
        
            .row-container {
                flex-direction: column-reverse;
            }
            
            .row-container .gap-2 {
                gap: 0.8rem;
            }
            
            #pdfSlides, #pdfViewerContainer {
                padding-left: 0px;
                padding-right: 0px;
            }
            
            .hover-shadow {
                position: relative;
                display: inline-block;
                transition: all 0.3s ease;
            }
        
            .hover-shadow:hover {
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                transform: translateY(-2px);
                background-color: #f1f1f1;
            }
        
            .hover-shadow:active {
                transform: translateY(0);
                background-color: #e1e1e1;
            }
        
            /* Thêm hiệu ứng khi hover */
            .text-body {
                color: #333;
                transition: color 0.3s ease;
            }
        
            .hover-shadow:hover .text-body {
                color: #007bff;
            }
        
            /* Thêm màu sắc cho link khi hover */
            .hover-shadow:hover {
                background-color: #f8f9fa;
            }
        }
        .border-bottom {
            border-bottom: solid 1px #c1cad2;
        }
        
        .transition-colors.white-space-nowrap:hover {
            background-color: #e8f9fa;
        }
        
        
    </style>
@endsection
@section('content')
<div class="row row-container">
    <div class="col-xl-2" id="pdfSlides" style="overflow-y:auto; height: 75vh;"></div>
    <div class="col-xl-10" id="pdfViewerContainer">
        <canvas id="pdfViewer" style="width:100%; height:70vh;"></canvas>
        <br>
    </div>
</div>

<div class="lqd-floating-menu group fixed bottom-20 end-12 isolate z-50 hidden lg:block">
    <button
        class="size-14 translate-x-0 transform-gpu overflow-hidden rounded-full border-none bg-transparent p-0 text-white shadow-lg outline-none"
        type="button"
    >
        <span
            class="bg-primary relative mb-1 inline-flex h-full w-full items-center justify-center overflow-hidden rounded-full before:absolute before:left-0 before:top-0 before:h-full before:w-full before:animate-spin-grow before:rounded-full"
        >
            <x-tabler-download class="relative transition-transform duration-300" />
        </span>
    </button>
    <div
        class="invisible absolute bottom-full end-0 mb-4 translate-y-2 opacity-0 transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100"
        id="add-new-floating"
    >
        <div class="rounded-xl shadow-xl bg-white dark:bg-surface border border-gray-200 dark:border-gray-700 overflow-hidden text-sm font-medium text-gray-800 dark:text-gray-100 min-w-[160px]">
            <a href="{{ asset($pitchDeck->pdf_url) }}"
                download
                class="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors white-space-nowrap">
                📄 {{ __('Download PDF') }}
            </a>
            <a href="{{ $pitchDeck->pptx_url }}"
                download
                class="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border-t border-gray-200 dark:border-gray-700 white-space-nowrap">
                📊 {{ __('Download PPTX') }}
            </a>
        </div>
    </div>

</div>
@endsection

@push('script')
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js"></script>
    <script>
        let contentHeight = $('.lqd-page-content-container').outerHeight();
        $('#pdfSlides').height(contentHeight);
        $(document).ready(function () {
            const pdfUrl = "{{ asset($pitchDeck->pdf_url) }}";
            const pdfjsLib = window["pdfjs-dist/build/pdf"];
            pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
    
            let $viewerCanvas = $("#pdfViewer")[0];
            let viewerCtx = $viewerCanvas.getContext("2d");
            let $slidesContainer = $("#pdfSlides");
    
            function renderPage(pdf, pageNum) {
                pdf.getPage(pageNum).then(function (page) {
                    let containerWidth = $("#pdfViewerContainer").width() || 450;
                    let viewport = page.getViewport({ scale: 1 });
                    let scale = containerWidth / viewport.width;
                    let scaledViewport = page.getViewport({ scale });
    
                    let dpiScale = window.devicePixelRatio || 2;
                    let canvasWidth = Math.floor(scaledViewport.width * dpiScale);
                    let canvasHeight = Math.floor(scaledViewport.height * dpiScale);
    
                    $viewerCanvas.width = canvasWidth;
                    $viewerCanvas.height = canvasHeight;
                    $viewerCanvas.style.width = `${scaledViewport.width}px`;
                    $viewerCanvas.style.height = `${scaledViewport.height}px`;
    
                    viewerCtx.setTransform(1, 0, 0, 1, 0, 0);
                    viewerCtx.scale(dpiScale, dpiScale);
    
                    let renderContext = {
                        canvasContext: viewerCtx,
                        viewport: scaledViewport,
                    };
    
                    $viewerCanvas.style.opacity = "0";
                    page.render(renderContext).promise.then(() => {
                        $viewerCanvas.style.opacity = "1";
                    });
    
                    $(".pdf-slide").removeClass("active-slide");
                    $("#slide-" + pageNum).addClass("active-slide");
                });
            }
    
            pdfjsLib.getDocument(pdfUrl).promise.then(function (pdf) {
                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                    pdf.getPage(pageNum).then(function (page) {
                        let scale = 0.18;
                        let viewport = page.getViewport({ scale });
    
                        let dpi = window.devicePixelRatio || 2;
                        let canvas = document.createElement("canvas");
                        let context = canvas.getContext("2d");
    
                        canvas.width = viewport.width * dpi;
                        canvas.height = viewport.height * dpi;
                        canvas.style.width = `${viewport.width}px`;
                        canvas.style.height = `${viewport.height}px`;
                        context.scale(dpi, dpi);
    
                        page.render({ canvasContext: context, viewport: viewport });
    
                        $(canvas)
                            .addClass("pdf-slide border shadow-sm")
                            .attr("id", "slide-" + pageNum)
                            .css({
                                margin: "0 6px 12px 6px",
                                display: "block",
                                borderRadius: "8px",
                                cursor: "pointer",
                                transition: "box-shadow 0.3s ease",
                            })
                            .hover(
                                function () {
                                    $(this).css("box-shadow", "0 0 8px rgba(0,0,0,0.3)");
                                },
                                function () {
                                    $(this).css("box-shadow", "0 0 0 transparent");
                                }
                            )
                            .on("click", function () {
                                renderPage(pdf, pageNum);
                            });
    
                        $slidesContainer.append(canvas);
    
                        if (pageNum === 1) {
                            renderPage(pdf, 1);
                        }
                    });
                }
            }).catch(function (error) {
                console.error("Lỗi tải PDF:", error);
            });
        });
        function updatePdfLayout() {
            const isXL = window.innerWidth >= 1200;
        
            if (!isXL) {
                // Mobile / Tablet: horizontal layout
                $('#pdfSlides')
                    .removeClass('col-xl-2')
                    .addClass('w-100 d-flex flex-row flex-nowrap gap-2 mt-3')
                    .css({
                        overflowX: 'auto',
                        overflowY: 'hidden',
                        height: '', // remove fixed height
                    });
        
                $('#pdfViewerContainer')
                    .removeClass('col-xl-10')
                    .addClass('w-100 order-first'); // move pdfViewer on top
            } else {
                // Desktop: restore layout
                $('#pdfSlides')
                    .removeClass('w-100 d-flex flex-row flex-nowrap gap-2 mt-3')
                    .addClass('col-xl-2')
                    .css({
                        overflowX: '',
                        overflowY: 'auto',
                        height: '75vh',
                    });
        
                $('#pdfViewerContainer')
                    .removeClass('w-100 order-first')
                    .addClass('col-xl-10');
            }
        }
        
        $(document).ready(function () {
            updatePdfLayout();
            $(window).on('resize', updatePdfLayout);
        });

</script>

@endpush
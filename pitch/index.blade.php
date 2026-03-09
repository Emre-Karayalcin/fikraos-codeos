@extends('panel.layout.app')
@section('title', __('What would you like to do?'))
@section('titlebar_actions', '')
@section('titlebar_before', '')
@section('titlebar_pretitle', '')


@section('additional_css')
    <style>
        .h-150 {
            min-height: 150px;    
        }
        
        .bg-gray {
            background-color: #F5F4F4;
        }
        .w-45 {
            width: 47%;
        }
        .w-fit-content {
            width: fit-content;
        }
        
        .card .bg-primary {
            background-color: #2BD3CA;
            background: #2BD3CA;
        }
        
        .card .bg-white {
            background-color: white;
            background: white;
        }
        .blur-3 {
            filter: blur(3px);
            pointer-events: none;
        }
        
        .bg-gradient-to-br.text-white {
            background-image: linear-gradient(to right bottom, rgb(6, 78, 59) 10%, rgb(4, 97, 72), rgb(38, 38, 38) 90%);
        }
        
        h1.fs-30 {
            font-size: 35px !important;
            color: white;
        }
        
        h3.text-lg {
            color: white;
            font-size: 1.125rem;
            line-height: 1.75rem;
        }
        
        .card-pitch {
            margin-bottom: 15px;
            max-height: 250px;
            background: #e5e5e5;
            display: flex;
            align-items: center;
            justify-content: center;
        }
    
        .card-pitch img {
            height: 200px;
            width: 93%;
        }
        
        .pitch-container {
            cursor: pointer;
        }
        
        .bg-neutral-800 {
            --tw-bg-opacity: 1;
            background-color: rgb(38 38 38 / var(--tw-bg-opacity, 1));
        }
        
        .pitch-container:hover .bg-hover-cover {
            opacity: 0.05;
        }
        
        .btn-generate-pitch:hover {
            color: white !important;
            opacity: 0.8;
        }
        
        
        #pdfViewerContainer {
            width: 100%;
            max-width: 450px;
            height: 100%;
            /*aspect-ratio: 4 / 3;*/
            background: #f8f9fa;
            display: flex;
            justify-content: center;
            align-items: center;
            border-radius: 10px;
            overflow: hidden;
        }
        canvas {
            transition: opacity 0.3s ease-in-out;
        }
        /* Danh sách slide - Giới hạn chiều cao */
        #pdfSlides {
            max-height: 320px;
            overflow-y: auto;
            padding-right: 10px;
        }
        .pdf-slide {
            width: 47%;
            height: auto;
            max-height: 100px;
            cursor: pointer;
            transition: transform 0.2s ease-in-out;
            border-radius: 5px;
        }
        .pdf-slide:hover {
            transform: scale(1.1);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }
        .active-slide {
            border: 2px solid #007bff;
        }
        
        .bg-primary-lt {
            background-color: #fcf5f1;
        }
        
        .bg-primary-lt:hover {
            background-color: #fad9c7;
            border-color: #cf4f00;
        }
        
        .bg-indigo-50 {
            --tw-bg-opacity: 1;
            background-color: rgb(238 242 255 / var(--tw-bg-opacity, 1));
        }
        
        .aspect-video {
            aspect-ratio: 16 / 9;
        }
        
        .bg-primary.text-white:hover {
            opacity: 0.8;
        }
        
        .bg-white.text-black:hover {
            opacity: 0.8;
            background-color: white!important;
            color: black!important;
        }
        
        .bg-blue-50 {
            background-color: #fcf5f1;
        }
        
        .bg-gray-100 {
            --tw-bg-opacity: 1;
            background-color: rgb(242 244 247 / var(--tw-bg-opacity, 1));
        }
        .border-gray-200 {
            --tw-border-opacity: 1;
            border-color: rgb(229 233 242 / var(--tw-border-opacity, 1));
        }
        
        .w-8 {
            width: 2rem;
        }
        
        .\[appearance\:textfield\] {
            -webkit-appearance: textfield;
            -moz-appearance: textfield;
            appearance: textfield;
        }
        
        input.custom-slide[type="number"]::-webkit-inner-spin-button,
        input.custom-slide[type="number"]::-webkit-outer-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }
        input.custom-slide[type="number"] {
            -moz-appearance: textfield;
        }
        
        .radio-fake .rect-second {
            stroke: #D0D5DD;
        }
        
        .radio-fake.active {
            border-color: hsl(var(--primary));
            background-color: #fcf5f1;
        }
        
        .radio-fake.active .rect-second {
            stroke: hsl(var(--primary));
        }
        
        .radio-fake.active circle {
            fill: hsl(var(--primary));
        }
        
        .btn-secondary:hover {
            background-color: var(--tblr-btn-hover-bg) !important;
            opacity: 0.8;
        }
        
        .suggest-topic:hover, .suggest-instructions:hover {
            background-color: #fcf5f1;
            border-color: hsl(var(--primary));
            opacity: 0.8;
        }
        
        .border-primary-500 {
            border-color: hsl(var(--primary));
            border-style: solid;
            border-width: 2.8px;
        }
        
        .aspect-video img.z-10 {
          transition: opacity 0.4s ease-in-out;
        }
        
        .form-switch .form-check-input:checked {
            background-color: hsl(var(--primary)) !important;
        }
        
        .slide-border:hover {
            border-color: hsl(var(--primary));
            border-style: solid;
            border-width: 1.5px;
        }
        
        .bg-white.text-black.filter-silde.active {
            background-color: hsl(var(--primary)) !important;
            color: white !important;
        }
        
        .btn-upgrade-pitch:hover {
            border-color: hsl(var(--primary));
            opacity: 0.9;
        }
        
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.7;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
    </style>
@endsection
@section('content')
<div class="page-body">
    <div class="mt-5 mb-5">
        <button class="btn d-flex align-items-start gap-3 p-3 border border-primary shadow-sm hover-border-primary bg-primary-lt" style="border-radius: 1rem; max-width: 360px;"  data-bs-toggle="modal" data-bs-target="#bankAccountModal">
            <div class="d-flex justify-content-center align-items-center border bg-white text-primary hover-text-primary" style="border-radius: 10px; padding: 0.75rem; border-color: #eaecf0;">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <path d="M14.0036 18.6667V24.5M14.0036 18.6667L21.0036 24.5M14.0036 18.6667L7.00358 24.5M24.5036 3.5V13.0667C24.5036 15.0268 24.5036 16.0069 24.1221 16.7556C23.7865 17.4142 23.2511 17.9496 22.5925 18.2852C21.8439 18.6667 20.8638 18.6667 18.9036 18.6667H9.10358C7.1434 18.6667 6.16331 18.6667 5.41461 18.2852C4.75605 17.9496 4.22061 17.4142 3.88506 16.7556C3.50358 16.0069 3.50358 15.0268 3.50358 13.0667V3.5M9.33691 10.5V14M14.0036 8.16667V14M18.6702 12.8333V14M25.6702 3.5H2.33691" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <div class="text-start" style="max-width: 300px; white-space: normal;"> 
                <div class="fw-bold text-dark font-bold mb-2">{{ __('Create Pitch Deck with AI') }}</div>
                <div class="text-muted small">{{ __('Create or design Pitch Deck from your idea.') }}</div>
            </div>
        </button>
    </div>
    <div class="mb-5">
        <x-button class="flex items-center justify-around gap-2 rounded-lg border text-center text-sm font-semibold bg-white text-black filter-silde active" type="button" data-active="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M11.6668 1.8916V5.33372C11.6668 5.80043 11.6668 6.03378 11.7577 6.21204C11.8376 6.36885 11.965 6.49633 12.1218 6.57622C12.3001 6.66705 12.5335 6.66705 13.0002 6.66705H16.4423M13.3335 10.8337H6.66683M13.3335 14.167H6.66683M8.3335 7.50033H6.66683M11.6668 1.66699H7.3335C5.93336 1.66699 5.2333 1.66699 4.69852 1.93948C4.22811 2.17916 3.84566 2.56161 3.60598 3.03202C3.3335 3.5668 3.3335 4.26686 3.3335 5.66699V14.3337C3.3335 15.7338 3.3335 16.4339 3.60598 16.9686C3.84566 17.439 4.22811 17.8215 4.69852 18.0612C5.2333 18.3337 5.93336 18.3337 7.3335 18.3337H12.6668C14.067 18.3337 14.767 18.3337 15.3018 18.0612C15.7722 17.8215 16.1547 17.439 16.3943 16.9686C16.6668 16.4339 16.6668 15.7338 16.6668 14.3337V6.66699L11.6668 1.66699Z" stroke="currentColor" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
            <span class="whitespace-nowrap">{{ __('All') }}</span>
        </x-button>
    </div>
    
    <div class="mb-5 grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        @if (count($decks) > 0)
            @foreach($decks as $deck)
                <div
                    role="button"
                    class="group relative box-border flex w-full flex-col gap-4 rounded-lg border-2 border-transparent slide-border bg-white p-5 shadow transition-colors"
                    onclick="goToViaUrl('{{ (LaravelLocalization::localizeUrl(route('dashboard.user.pitch.show', $deck->id))) }}')"
                >
                    <div class="flex w-full flex-col gap-8">
                        <div class="flex w-full items-center justify-between">
                            <div class="flex items-center gap-4">
                                <div class="[&amp;>svg]:size-6 rounded-md bg-gray-100 p-1.5">
                                    <x-tabler-presentation-analytics class="size-5 text-primary" />
                                </div>
                            </div>
                            <div class="flex items-center gap-2">
                                <div
                                    class="relative cursor-pointer py-2 text-gray-400 transition-colors hover:text-gray-700"
                                    type="button"
                                    onclick="event.stopPropagation(); confirmDelete({{ $deck->id }}, '{{ $deck->name }}')"
                                    aria-haspopup="menu"
                                    aria-expanded="false"
                                    data-state="closed"
                                >
                                    <x-tabler-x class="size-5" />
                                </div>
                            </div>
                        </div>
                        <div class="flex max-w-full flex-col items-start gap-2">
                            <h5 class="max-w-full truncate text-sm font-semibold text-gray-800">
                                {{ $deck->name }}
                            </h5>
                            <div class="text-xs text-gray-500">{{ $deck->added_ago_text }}</div>
                        </div>
                    </div>
                </div>
            @endforeach
        @endif
    </div>
</div>
<div class="modal fade" id="confirmDeleteModal" tabindex="-1" role="dialog">
    <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content border-0 shadow-lg rounded-lg">
            <div class="modal-body text-center">
                <h4 id="delete-confirm-message" class="mb-0">{{ __('Are you sure you want to delete this pitch deck?') }}</h4>
            </div>
            <div class="modal-footer justify-content-center">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">{{ __('Cancel') }}</button>
                <button type="button" class="btn btn-danger" id="delete-confirm-btn">{{ __('Delete') }}</button>
            </div>
        </div>
    </div>
</div>
<div class="modal fade" id="bankAccountModal" tabindex="-1" aria-labelledby="bankAccountModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content">
            <div class="flex w-full max-w-[872px] flex-col items-center gap-8">
                <div class="modal-header border-none">
                    <div class="pt-5">
                        <h2
                            class="text-center text-2xl font-semibold text-gray-800"
                            id="radix-«r18»"
                        >
                            {{ __('Create Pitch Deck') }}
                        </h2>
                        <p class="text-center text-slate-700">
                            {{ __('How would you like to get started?') }}
                        </p>
                    </div>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close">
                        <x-tabler-x class="size-6" />
                    </button>
                </div>
                <div class="flex gap-4 p-6">
                    <div class="flex size-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow hidden">
                        <div class="grid aspect-video w-full place-content-center bg-indigo-50"><svg width="152" height="104"
                                viewBox="0 0 152 104" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <g filter="url(#filter0_dd_1622_35036)">
                                    <path
                                        d="M41.7266 78.7729L74.9651 63.2735C76.6339 62.4953 77.3559 60.5116 76.5777 58.8428L56.9484 16.7476L43.6563 11.9097L16.4611 24.591C14.7923 25.3692 14.0703 27.3529 14.8485 29.0217L37.2959 77.1602C38.074 78.8291 40.0577 79.5511 41.7266 78.7729Z"
                                        fill="url(#paint0_linear_1622_35036)"></path>
                                    <path d="M43.6562 11.9102L56.9484 16.7481L47.8834 20.9752L43.6562 11.9102Z" fill="#D0D5DD"></path>
                                    <g clip-path="url(#clip0_1622_35036)">
                                        <path
                                            d="M37.4004 35.9187C40.4464 33.178 42.3347 39.5193 43.3093 45.9253C44.252 52.1249 44.3591 58.8976 41.1682 57.762C37.3021 56.3871 41.8756 51.576 46.9529 47.0257C51.6174 42.8437 57.1842 39.1527 57.6948 43.0588C58.1506 46.5593 52.3992 45.1613 46.2621 43.143C40.2732 41.1748 34.5281 38.5045 37.4004 35.9187Z"
                                            stroke="#F04438" stroke-width="2"></path>
                                    </g>
                                </g>
                                <g filter="url(#filter1_dd_1622_35036)">
                                    <path
                                        d="M56.7735 67.7831H93.4482C95.2895 67.7831 96.7822 66.2904 96.7822 64.4491V18.0022L86.78 8H56.7735C54.9322 8 53.4395 9.49271 53.4395 11.3341V64.4491C53.4395 66.2904 54.9322 67.7831 56.7735 67.7831Z"
                                        fill="url(#paint1_linear_1622_35036)"></path>
                                    <path d="M86.7798 8L96.782 18.0022H86.7798V8Z" fill="#D0D5DD"></path>
                                    <g clip-path="url(#clip1_1622_35036)">
                                        <rect x="69.4395" y="27.5" width="18" height="21" rx="2"
                                            fill="url(#paint2_linear_1622_35036)"></rect>
                                        <path
                                            d="M69.4395 43.25H87.4395V46.5C87.4395 47.6046 86.544 48.5 85.4395 48.5H71.4395C70.3349 48.5 69.4395 47.6046 69.4395 46.5V43.25Z"
                                            fill="url(#paint3_linear_1622_35036)"></path>
                                        <rect x="69.4395" y="38" width="18" height="5.25" fill="url(#paint4_linear_1622_35036)"></rect>
                                        <rect x="69.4395" y="32.75" width="18" height="5.25" fill="url(#paint5_linear_1622_35036)">
                                        </rect>
                                        <path
                                            d="M69.4395 35.75C69.4395 34.0931 70.7826 32.75 72.4395 32.75H75.4395C77.0963 32.75 78.4395 34.0931 78.4395 35.75V43.25C78.4395 44.9069 77.0963 46.25 75.4395 46.25H69.4395V35.75Z"
                                            fill="black" fill-opacity="0.3"></path>
                                        <rect x="63.4395" y="31.25" width="13.5" height="13.5" rx="2"
                                            fill="url(#paint6_linear_1622_35036)"></rect>
                                        <path
                                            d="M74.6895 34.2606H73.2287L72.0816 39.1543L70.8267 34.25H69.5914L68.3267 39.1543L67.1895 34.2606H65.6895L67.6404 41.75H68.9346L70.1895 37.016L71.4444 41.75H72.7385L74.6895 34.2606Z"
                                            fill="white"></path>
                                    </g>
                                </g>
                                <g filter="url(#filter2_dd_1622_35036)">
                                    <path
                                        d="M76.7621 63.5909L110.001 79.0903C111.669 79.8685 113.653 79.1465 114.431 77.4777L134.061 35.3825L129.223 22.0903L102.028 9.40903C100.359 8.63085 98.375 9.35286 97.5968 11.0217L75.1495 59.1602C74.3713 60.8291 75.0933 62.8128 76.7621 63.5909Z"
                                        fill="url(#paint7_linear_1622_35036)"></path>
                                    <path d="M129.223 22.0898L134.061 35.382L124.996 31.1549L129.223 22.0898Z" fill="#D0D5DD"></path>
                                    <g clip-path="url(#clip2_1622_35036)">
                                        <circle cx="106.946" cy="44.8043" r="10.5" transform="rotate(25 106.946 44.8043)"
                                            fill="url(#paint8_linear_1622_35036)"></circle>
                                        <mask id="mask0_1622_35036" maskUnits="userSpaceOnUse" x="96" y="34" width="22" height="22">
                                            <circle cx="106.946" cy="44.8043" r="10.5" transform="rotate(25 106.946 44.8043)"
                                                fill="#C4C4C4"></circle>
                                        </mask>
                                        <g mask="url(#mask0_1622_35036)">
                                            <rect x="112.697" y="34.2451" width="12.75" height="12.75"
                                                transform="rotate(25 112.697 34.2451)" fill="url(#paint9_linear_1622_35036)"></rect>
                                            <path
                                                d="M100.42 39.2785C101.12 37.7769 102.905 37.1272 104.406 37.8274L108.485 39.7292C109.986 40.4294 110.636 42.2144 109.936 43.716L106.766 50.5133C106.066 52.0149 104.281 52.6646 102.779 51.9644L95.9822 48.7947L100.42 39.2785Z"
                                                fill="black" fill-opacity="0.3"></path>
                                            <rect x="101.142" y="28.8574" width="12.75" height="12.75"
                                                transform="rotate(25 101.142 28.8574)" fill="#EB6C4D"></rect>
                                        </g>
                                        <rect x="98.2432" y="33.2979" width="13.5" height="13.5" rx="2"
                                            transform="rotate(25 98.2432 33.2979)" fill="url(#paint10_linear_1622_35036)"></rect>
                                        <path
                                            d="M104.716 42.4876C105.4 41.0213 104.847 39.6876 103.316 38.9738L101.054 37.9189L97.8841 44.7163L99.2881 45.371L100.253 43.3026L101.052 43.6755C102.485 44.3438 103.987 44.051 104.716 42.4876ZM103.279 41.8529C102.971 42.5133 102.353 42.745 101.67 42.4267L100.841 42.0403L101.865 39.8457L102.684 40.2276C103.366 40.5459 103.628 41.1052 103.279 41.8529Z"
                                            fill="white"></path>
                                    </g>
                                </g>
                                <defs>
                                    <filter id="filter0_dd_1622_35036" x="1.43945" y="7.68262" width="88.5474" height="96.499"
                                        filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                                        <feFlood flood-opacity="0" result="BackgroundImageFix"></feFlood>
                                        <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                                            result="hardAlpha"></feColorMatrix>
                                        <feMorphology radius="2" operator="erode" in="SourceAlpha"
                                            result="effect1_dropShadow_1622_35036"></feMorphology>
                                        <feOffset dy="4"></feOffset>
                                        <feGaussianBlur stdDeviation="3"></feGaussianBlur>
                                        <feColorMatrix type="matrix"
                                            values="0 0 0 0 0.0627451 0 0 0 0 0.0941176 0 0 0 0 0.156863 0 0 0 0.03 0"></feColorMatrix>
                                        <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1622_35036"></feBlend>
                                        <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                                            result="hardAlpha"></feColorMatrix>
                                        <feMorphology radius="4" operator="erode" in="SourceAlpha"
                                            result="effect2_dropShadow_1622_35036"></feMorphology>
                                        <feOffset dy="12"></feOffset>
                                        <feGaussianBlur stdDeviation="8"></feGaussianBlur>
                                        <feColorMatrix type="matrix"
                                            values="0 0 0 0 0.0627451 0 0 0 0 0.0941176 0 0 0 0 0.156863 0 0 0 0.08 0"></feColorMatrix>
                                        <feBlend mode="normal" in2="effect1_dropShadow_1622_35036"
                                            result="effect2_dropShadow_1622_35036"></feBlend>
                                        <feBlend mode="normal" in="SourceGraphic" in2="effect2_dropShadow_1622_35036" result="shape">
                                        </feBlend>
                                    </filter>
                                    <filter id="filter1_dd_1622_35036" x="41.4395" y="8" width="67.3428" height="83.7832"
                                        filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                                        <feFlood flood-opacity="0" result="BackgroundImageFix"></feFlood>
                                        <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                                            result="hardAlpha"></feColorMatrix>
                                        <feMorphology radius="2" operator="erode" in="SourceAlpha"
                                            result="effect1_dropShadow_1622_35036"></feMorphology>
                                        <feOffset dy="4"></feOffset>
                                        <feGaussianBlur stdDeviation="3"></feGaussianBlur>
                                        <feColorMatrix type="matrix"
                                            values="0 0 0 0 0.0627451 0 0 0 0 0.0941176 0 0 0 0 0.156863 0 0 0 0.03 0"></feColorMatrix>
                                        <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1622_35036">
                                        </feBlend>
                                        <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                                            result="hardAlpha"></feColorMatrix>
                                        <feMorphology radius="4" operator="erode" in="SourceAlpha"
                                            result="effect2_dropShadow_1622_35036"></feMorphology>
                                        <feOffset dy="12"></feOffset>
                                        <feGaussianBlur stdDeviation="8"></feGaussianBlur>
                                        <feColorMatrix type="matrix"
                                            values="0 0 0 0 0.0627451 0 0 0 0 0.0941176 0 0 0 0 0.156863 0 0 0 0.08 0"></feColorMatrix>
                                        <feBlend mode="normal" in2="effect1_dropShadow_1622_35036"
                                            result="effect2_dropShadow_1622_35036"></feBlend>
                                        <feBlend mode="normal" in="SourceGraphic" in2="effect2_dropShadow_1622_35036" result="shape">
                                        </feBlend>
                                    </filter>
                                    <filter id="filter2_dd_1622_35036" x="61.7402" y="8" width="88.5474" height="96.499"
                                        filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                                        <feFlood flood-opacity="0" result="BackgroundImageFix"></feFlood>
                                        <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                                            result="hardAlpha"></feColorMatrix>
                                        <feMorphology radius="2" operator="erode" in="SourceAlpha"
                                            result="effect1_dropShadow_1622_35036"></feMorphology>
                                        <feOffset dy="4"></feOffset>
                                        <feGaussianBlur stdDeviation="3"></feGaussianBlur>
                                        <feColorMatrix type="matrix"
                                            values="0 0 0 0 0.0627451 0 0 0 0 0.0941176 0 0 0 0 0.156863 0 0 0 0.03 0"></feColorMatrix>
                                        <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1622_35036">
                                        </feBlend>
                                        <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                                            result="hardAlpha"></feColorMatrix>
                                        <feMorphology radius="4" operator="erode" in="SourceAlpha"
                                            result="effect2_dropShadow_1622_35036"></feMorphology>
                                        <feOffset dy="12"></feOffset>
                                        <feGaussianBlur stdDeviation="8"></feGaussianBlur>
                                        <feColorMatrix type="matrix"
                                            values="0 0 0 0 0.0627451 0 0 0 0 0.0941176 0 0 0 0 0.156863 0 0 0 0.08 0"></feColorMatrix>
                                        <feBlend mode="normal" in2="effect1_dropShadow_1622_35036"
                                            result="effect2_dropShadow_1622_35036"></feBlend>
                                        <feBlend mode="normal" in="SourceGraphic" in2="effect2_dropShadow_1622_35036" result="shape">
                                        </feBlend>
                                    </filter>
                                    <linearGradient id="paint0_linear_1622_35036" x1="39.7738" y1="78.9026" x2="13.2853"
                                        y2="31.1154" gradientUnits="userSpaceOnUse">
                                        <stop stop-color="#E4E7EC"></stop>
                                        <stop offset="1" stop-color="#F9FAFB"></stop>
                                    </linearGradient>
                                    <linearGradient id="paint1_linear_1622_35036" x1="54.9489" y1="67.0755" x2="51.1379"
                                        y2="12.571" gradientUnits="userSpaceOnUse">
                                        <stop stop-color="#E4E7EC"></stop>
                                        <stop offset="1" stop-color="#F9FAFB"></stop>
                                    </linearGradient>
                                    <linearGradient id="paint2_linear_1622_35036" x1="69.4395" y1="31" x2="87.4395"
                                        y2="31" gradientUnits="userSpaceOnUse">
                                        <stop stop-color="#2B78B1"></stop>
                                        <stop offset="1" stop-color="#338ACD"></stop>
                                    </linearGradient>
                                    <linearGradient id="paint3_linear_1622_35036" x1="69.4395" y1="46.5313" x2="87.4395"
                                        y2="46.5313" gradientUnits="userSpaceOnUse">
                                        <stop stop-color="#1B366F"></stop>
                                        <stop offset="1" stop-color="#2657B0"></stop>
                                    </linearGradient>
                                    <linearGradient id="paint4_linear_1622_35036" x1="77.3145" y1="41" x2="87.4395"
                                        y2="41" gradientUnits="userSpaceOnUse">
                                        <stop stop-color="#20478B"></stop>
                                        <stop offset="1" stop-color="#2D6FD1"></stop>
                                    </linearGradient>
                                    <linearGradient id="paint5_linear_1622_35036" x1="77.3145" y1="35.75" x2="87.4395"
                                        y2="35.75" gradientUnits="userSpaceOnUse">
                                        <stop stop-color="#215295"></stop>
                                        <stop offset="1" stop-color="#2E84D3"></stop>
                                    </linearGradient>
                                    <linearGradient id="paint6_linear_1622_35036" x1="63.4395" y1="38.75" x2="77.6895"
                                        y2="38.75" gradientUnits="userSpaceOnUse">
                                        <stop stop-color="#223E74"></stop>
                                        <stop offset="1" stop-color="#215091"></stop>
                                    </linearGradient>
                                    <linearGradient id="paint7_linear_1622_35036" x1="75.4075" y1="62.1785" x2="94.9882"
                                        y2="11.17" gradientUnits="userSpaceOnUse">
                                        <stop stop-color="#E4E7EC"></stop>
                                        <stop offset="1" stop-color="#F9FAFB"></stop>
                                    </linearGradient>
                                    <linearGradient id="paint8_linear_1622_35036" x1="96.4459" y1="46.2526" x2="117.446"
                                        y2="46.2526" gradientUnits="userSpaceOnUse">
                                        <stop stop-color="#A73A24"></stop>
                                        <stop offset="1" stop-color="#F75936"></stop>
                                    </linearGradient>
                                    <linearGradient id="paint9_linear_1622_35036" x1="122.822" y1="41.7451" x2="112.697"
                                        y2="41.7451" gradientUnits="userSpaceOnUse">
                                        <stop stop-color="#FDB8A3"></stop>
                                        <stop offset="1" stop-color="#F1876D"></stop>
                                    </linearGradient>
                                    <linearGradient id="paint10_linear_1622_35036" x1="98.2432" y1="40.9789" x2="111.743"
                                        y2="40.9789" gradientUnits="userSpaceOnUse">
                                        <stop stop-color="#A73A24"></stop>
                                        <stop offset="1" stop-color="#F75936"></stop>
                                    </linearGradient>
                                    <clipPath id="clip0_1622_35036">
                                        <rect width="24" height="24" fill="white"
                                            transform="translate(30.1099 38.0869) rotate(-25)"></rect>
                                    </clipPath>
                                    <clipPath id="clip1_1622_35036">
                                        <rect width="24" height="24" fill="white" transform="translate(63.4395 26)"></rect>
                                    </clipPath>
                                    <clipPath id="clip2_1622_35036">
                                        <rect width="24" height="24" fill="white"
                                            transform="translate(100.462 28.54) rotate(25)"></rect>
                                    </clipPath>
                                </defs>
                            </svg></div>
                        <div class="flex flex-1 flex-col gap-4 py-7">
                            <div class="flex flex-1 flex-col">
                                <h3 class="text-xl font-semibold text-gray-800 text-center">{{ __('From a document') }}</h3>
                            </div>
                            <div class="flex flex-1 flex-col px-7">
                                <p class="text-center text-sm leading-tight text-slate-700">{{ __('Upload any Word, Excel file and
                                    generate a presentation from it.') }}</p>
                            </div>
                            <div class="mt-2 flex justify-center px-7">
                                <div class="" data-state="closed">
                                    <div class="">
                                        <x-button
                                            class="flex items-center justify-around rounded-lg border bg-primary text-white"
                                            type="button"
                                            onclick="showPresentationModal(0);"
                                        >
                                            {{ __('Start now') }}
                                        </x-button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div
                        class="flex size-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow"
                    >
                        <div
                            class="grid aspect-video w-full place-content-center bg-indigo-50"
                        >
                            <svg width="164" height="96" viewBox="0 0 164 96" fill="none" xmlns="http://www.w3.org/2000/svg"><g filter="url(#filter0_dd_742_6137)"><path d="M12 33.0109C12 19.0053 12 12.0025 16.35 7.38165C20.7001 2.76078 27.5766 2.34519 41.3296 1.51401C54.4876 0.718792 69.765 0 82 0C94.235 0 109.512 0.718792 122.67 1.51401C136.423 2.34519 143.3 2.76078 147.65 7.38165C152 12.0025 152 19.0053 152 33.0109V38.9891C152 52.9947 152 59.9975 147.65 64.6183C143.3 69.2392 136.423 69.6548 122.67 70.486C109.512 71.2812 94.235 72 82 72C69.765 72 54.4876 71.2812 41.3296 70.486C27.5766 69.6548 20.7001 69.2392 16.35 64.6183C12 59.9975 12 52.9947 12 38.9891V33.0109Z" fill="url(#paint0_linear_742_6137)"></path></g><path d="M51.0182 48C49.9199 48 49.0296 47.1097 49.0296 46.0114V27.9771C49.0296 26.8789 49.9199 25.9886 51.0182 25.9886C52.1165 25.9886 53.0068 26.8789 53.0068 27.9771V46.0114C53.0068 47.1097 52.1165 48 51.0182 48ZM43.4753 27.6343C42.4718 27.6343 41.6582 26.8207 41.6582 25.8171C41.6582 24.8136 42.4718 24 43.4753 24H58.5611C59.5646 24 60.3782 24.8136 60.3782 25.8171C60.3782 26.8207 59.5646 27.6343 58.5611 27.6343H43.4753Z" fill="#1570EF"></path><rect x="70.7129" y="43.5" width="51" height="4.5" rx="2.25" fill="#98A2B3"></rect><defs><filter id="filter0_dd_742_6137" x="0" y="0" width="164" height="96" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"></feFlood><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"></feColorMatrix><feMorphology radius="2" operator="erode" in="SourceAlpha" result="effect1_dropShadow_742_6137"></feMorphology><feOffset dy="4"></feOffset><feGaussianBlur stdDeviation="3"></feGaussianBlur><feColorMatrix type="matrix" values="0 0 0 0 0.0627451 0 0 0 0 0.0941176 0 0 0 0 0.156863 0 0 0 0.03 0"></feColorMatrix><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_742_6137"></feBlend><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"></feColorMatrix><feMorphology radius="4" operator="erode" in="SourceAlpha" result="effect2_dropShadow_742_6137"></feMorphology><feOffset dy="12"></feOffset><feGaussianBlur stdDeviation="8"></feGaussianBlur><feColorMatrix type="matrix" values="0 0 0 0 0.0627451 0 0 0 0 0.0941176 0 0 0 0 0.156863 0 0 0 0.08 0"></feColorMatrix><feBlend mode="normal" in2="effect1_dropShadow_742_6137" result="effect2_dropShadow_742_6137"></feBlend><feBlend mode="normal" in="SourceGraphic" in2="effect2_dropShadow_742_6137" result="shape"></feBlend></filter><linearGradient id="paint0_linear_742_6137" x1="16.8756" y1="66.3676" x2="15.5925" y2="9.40401" gradientUnits="userSpaceOnUse"><stop stop-color="#E4E7EC"></stop><stop offset="1" stop-color="#F9FAFB"></stop></linearGradient></defs></svg>
                        </div>
                        <div class="flex flex-1 flex-col gap-4 py-7">
                            <div class="flex flex-1 flex-col">
                                <h3 class="text-center text-xl font-semibold text-gray-800">
                                    {{ __('From a topic') }}
                                </h3>
                            </div>
                            <div class="flex flex-1 flex-col px-7">
                                <p class="text-center text-sm leading-tight text-slate-700">
                                    {{ __('Just type a topic, and our AI will handle the rest!') }}
                                </p>
                            </div>
                            <div class="mt-2 flex justify-center px-7">
                                <div class="" data-state="closed">
                                    <div class="">
                                        @if (count($decks) >= 1 && !checkUserActiveProplan(auth()->user()))
                                            <a
                                                data-bs-toggle="modal"
                                                data-bs-target="#upgradePopup"
                                                class="btn bg-white rounded-md btn-upgrade-pitch">
                                                <x-tabler-crown class="w-5 text-upgrade mx-2 text-primary" />
                                                {{ __('Upgrade to Pro') }}
                                            </a>
                                        @else
                                            <x-button
                                                class="flex items-center justify-around rounded-lg border bg-primary text-white"
                                                type="button"
                                                id="generate-presentation-from-document"
                                                onclick="showPresentationModal();"
                                            >
                                                {{ __('Start now') }}
                                            </x-button>
                                        @endif
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="createPresentationModal" tabindex="-1" aria-labelledby="createPresentationModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content">
            <div class="flex items-center gap-4 p-4 pb-0" id="normal-title">
                <div class="grid size-14 place-items-center rounded-full bg-blue-50 text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M14.0036 18.6667V24.5M14.0036 18.6667L21.0036 24.5M14.0036 18.6667L7.00358 24.5M24.5036 3.5V13.0667C24.5036 15.0268 24.5036 16.0069 24.1221 16.7556C23.7865 17.4142 23.2511 17.9496 22.5925 18.2852C21.8439 18.6667 20.8638 18.6667 18.9036 18.6667H9.10358C7.1434 18.6667 6.16331 18.6667 5.41461 18.2852C4.75605 17.9496 4.22061 17.4142 3.88506 16.7556C3.50358 16.0069 3.50358 15.0268 3.50358 13.0667V3.5M9.33691 10.5V14M14.0036 8.16667V14M18.6702 12.8333V14M25.6702 3.5H2.33691" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                    </svg>
                </div>
                <div class="flex flex-col gap-1">
                    <h4 class="text-2xl font-semibold text-gray-900 mb-1">{{ __('Create a pitch deck') }}</h4>
                    <p class="text-sm font-normal text-slate-600">{{ __('This will create a PowerPoint pitch deck based on a topic of your choice.') }}</p>
                </div>
            </div>
            <div class="flex items-center gap-4 p-4 pb-0" id="upload-title">
                <div class="rounded-lg border p-2.5 text-gray-900 shadow-sm"><svg width="20" height="20" viewBox="0 0 20 20"
                        fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                            d="M17.5 12.5V13.5C17.5 14.9001 17.5 15.6002 17.2275 16.135C16.9878 16.6054 16.6054 16.9878 16.135 17.2275C15.6002 17.5 14.9001 17.5 13.5 17.5H6.5C5.09987 17.5 4.3998 17.5 3.86502 17.2275C3.39462 16.9878 3.01217 16.6054 2.77248 16.135C2.5 15.6002 2.5 14.9001 2.5 13.5V12.5M14.1667 6.66667L10 2.5M10 2.5L5.83333 6.66667M10 2.5V12.5"
                            stroke="currentColor" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"></path>
                    </svg></div>
                <h2 id="radix-«r1g»" class="text-lg font-semibold text-gray-900">Select documents</h2>
            </div>
            <div id="pres-step-1">
                <div class="modal-body" id="upload-body">
                    <div class="flex max-w-full flex-col gap-6">
                    <div data-disabled="false"
                        class="z-50">
                        <div>
                            <div class="flex h-full cursor-pointer h-150 flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white p-4 transition-colors data-[uploading=false]:hover:border-blue-600 md:h-full md:p-8"
                                data-uploading="false" id="upload-dropzone" role="presentation"
                                tabindex="0"><input
                                    accept=".docx,.xlsx"
                                    multiple="" tabindex="-1" type="file"
                                    style="border: 0px; clip: rect(0px, 0px, 0px, 0px); clip-path: inset(50%); height: 1px; margin: 0px -1px -1px 0px; overflow: hidden; padding: 0px; position: absolute; width: 1px; white-space: nowrap;">
                                <div class="rounded-full bg-gray-50 p-2">
                                    <div class="rounded-full bg-gray-100 p-2"><svg width="20" height="20"
                                            viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path
                                                d="M17.5 12.5V13.5C17.5 14.9001 17.5 15.6002 17.2275 16.135C16.9878 16.6054 16.6054 16.9878 16.135 17.2275C15.6002 17.5 14.9001 17.5 13.5 17.5H6.5C5.09987 17.5 4.3998 17.5 3.86502 17.2275C3.39462 16.9878 3.01217 16.6054 2.77248 16.135C2.5 15.6002 2.5 14.9001 2.5 13.5V12.5M14.1667 6.66667L10 2.5M10 2.5L5.83333 6.66667M10 2.5V12.5"
                                                stroke="currentColor" stroke-width="1.66667" stroke-linecap="round"
                                                stroke-linejoin="round"></path>
                                        </svg></div>
                                </div>
                                <div class="mt-4 gap-0.5 space-y-1 text-center text-sm text-gray-600"><span
                                        class="font-semibold text-blue-700">{{ __('Click to upload') }}</span> {{ __('or drag and drop') }}<p
                                        class="text-xs">{{ __('Word, Excel (max 50 MB)') }}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                </div>
                <div class="modal-body" id="normal-body">
                    <div class="flex flex-col gap-4 rounded-xl border border-gray-200 bg-gray-100 p-4 shadow-sm">
                        <div class="flex flex-col gap-1">
                            <div class="flex h-full w-full flex-col gap-1">
                                <textarea
                                    id="presentation-steps-topic-input"
                                    rows="5"
                                    maxlength="3000"
                                    class="h-full w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-gray-900 outline-none placeholder:text-gray-500 focus:border-gray-400"
                                    placeholder="{{ __('Type a topic for your pitch deck.') }}"
                                ></textarea>
                                <div class="flex w-full justify-end text-sm text-gray-500">
                                    0/3000 {{ __('characters') }}
                                </div>
                            </div>
                        </div>
                        @php
                            $ideas = Auth::user()->projects()->orderBy('created_at', 'desc')->paginate(10);
                        @endphp
                        <div class="">
                            <h3 class="mb-3">{{ __('Which Idea would you like to submit?') }}</h3>
                            <select class="form-select" id="pitch_idea_selected" name="pitch_idea_selected" placeholer="{{ __('Choose Your Idea') }}">
                                <option value="" disabled selected hidden>{{ __('Choose Idea') }}</option>
                                @foreach($ideas as $idea)
                                    <option value="{{$idea->description}}">
                                        {{$idea->name}}
                                    </option>
                                @endforeach
                            </select>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <x-button class="btn btn-secondary rounded-lg bg-white prev-btn" type="button" disabled>
                        {{ __('Previous') }}
                    </x-button>
                    <x-button class="btn btn-primary rounded-lg next-btn" type="button" disabled>
                        {{ __('Next') }}
                    </x-button>
                </div>
            </div>
            <div id="pres-step-2" style="display: none;">
                <div class="modal-body">
                    <div class="rounded-lg border-gray-200 bg-gray-100 p-4">
                        <div
                            class="[&amp;>svg]:size-6 flex w-full items-center justify-between font-medium text-gray-900"
                            type="button"
                            aria-controls="radix-«r87»"
                            aria-expanded="true"
                            data-state="open"
                        >
                            <span class="font-bold text-gray-900" style="font-size: 1rem;">{{ __('General settings') }}</span>
                        </div>
                        <div class="mt-4" >
                            <div class="grid gap-4">
                                <div class="col-span-2 flex flex-col gap-1.5">
                                    <label class="text-sm font-medium leading-tight text-slate-700"
                                        >{{ __('Presentation length') }}</label
                                    >
                                    <div
                                        class="grid grid-cols-4 gap-2.5 text-sm leading-5 sm:grid-cols-4"
                                    >
                                        <div class="" data-state="closed">
                                            <div class="">
                                                <div
                                                    role="button"
                                                    class="radio-fake flex gap-2 rounded-lg border border-gray-300 bg-white p-3 transition-colors active"
                                                    data-state="closed"
                                                >
                                                    <div class="mt-0.5">
                                                        <svg
                                                            width="16"
                                                            height="16"
                                                            viewBox="0 0 16 16"
                                                            fill="none"
                                                            xmlns="http://www.w3.org/2000/svg"
                                                        >
                                                            <rect
                                                                x="0.5"
                                                                y="0.5"
                                                                width="15"
                                                                height="15"
                                                                rx="7.5"
                                                                fill="#EFF8FF"
                                                            ></rect>
                                                            <rect
                                                                class="rect-second"
                                                                x="0.5"
                                                                y="0.5"
                                                                width="15"
                                                                height="15"
                                                                rx="7.5"
                                                            ></rect>
                                                            <circle
                                                                cx="8"
                                                                cy="8"
                                                                r="5"
                                                            ></circle>
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <div class="mb-1 font-medium">{{ __('Short') }}</div>
                                                        <div class="text-gray-600" data-value="6">3-8 {{ __('slides') }}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="" data-state="closed">
                                            <div class="">
                                                <div
                                                    role="button"
                                                    class="radio-fake flex cursor-pointer gap-2 rounded-lg border border-gray-300 bg-white p-3 transition-colors"
                                                    data-state="closed"
                                                >
                                                    <div class="mt-0.5">
                                                        <svg
                                                            width="16"
                                                            height="16"
                                                            viewBox="0 0 16 16"
                                                            fill="none"
                                                            xmlns="http://www.w3.org/2000/svg"
                                                        >
                                                            <rect
                                                                x="0.5"
                                                                y="0.5"
                                                                width="15"
                                                                height="15"
                                                                rx="7.5"
                                                                fill="white"
                                                            ></rect>
                                                            <rect
                                                                class="rect-second"
                                                                x="0.5"
                                                                y="0.5"
                                                                width="15"
                                                                height="15"
                                                                rx="7.5"
                                                            ></rect>
                                                            <circle
                                                                cx="8"
                                                                cy="8"
                                                                r="5"
                                                            ></circle>
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <div class="mb-1 font-medium">
                                                            {{ __('Informative') }}
                                                        </div>
                                                        <div class="text-gray-600" data-value="10">8-12 {{ __('slides') }}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div
                                            data-state="closed"
                                        >
                                            <div>
                                                <div
                                                    role="button"
                                                    class="radio-fake flex cursor-pointer gap-2 rounded-lg border border-gray-300 bg-white p-3 transition-colors"
                                                    data-state="closed"
                                                >
                                                    <div class="mt-0.5">
                                                        <svg
                                                            width="16"
                                                            height="16"
                                                            viewBox="0 0 16 16"
                                                            fill="none"
                                                            xmlns="http://www.w3.org/2000/svg"
                                                        >
                                                            <rect
                                                                x="0.5"
                                                                y="0.5"
                                                                width="15"
                                                                height="15"
                                                                rx="7.5"
                                                                fill="white"
                                                            ></rect>
                                                            <rect
                                                                class="rect-second"
                                                                x="0.5"
                                                                y="0.5"
                                                                width="15"
                                                                height="15"
                                                                rx="7.5"
                                                            ></rect>
                                                            <circle
                                                                cx="8"
                                                                cy="8"
                                                                r="5"
                                                            ></circle>
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <div class="mb-1 font-medium">{{ __('Detailed') }}</div>
                                                        <div class="text-gray-600" data-value="14">12+ {{ __('slides') }}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div
                                            data-state="closed"
                                        >
                                            <div>
                                                <div
                                                    role="button"
                                                    class="radio-fake flex cursor-pointer gap-2 rounded-lg border border-gray-300 bg-white p-3 transition-colors"
                                                    data-state="closed"
                                                >
                                                    <div class="mt-0.5">
                                                        <svg
                                                            width="16"
                                                            height="16"
                                                            viewBox="0 0 16 16"
                                                            fill="none"
                                                            xmlns="http://www.w3.org/2000/svg"
                                                        >
                                                            <rect
                                                                x="0.5"
                                                                y="0.5"
                                                                width="15"
                                                                height="15"
                                                                rx="7.5"
                                                                fill="white"
                                                            ></rect>
                                                            <rect
                                                                class="rect-second"
                                                                x="0.5"
                                                                y="0.5"
                                                                width="15"
                                                                height="15"
                                                                rx="7.5"
                                                            ></rect>
                                                            <circle
                                                                cx="8"
                                                                cy="8"
                                                                r="5"
                                                            ></circle>
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <div class="mb-1 font-medium">{{ __('Custom') }}</div>
                                                        <div role="button">
                                                            <div class="flex items-center gap-x-1">
                                                                <button
                                                                    type="button"
                                                                    class="minus-btn inline-flex size-6 w-full items-center justify-center gap-x-2 rounded-md border border-gray-300 bg-white p-1 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 "
                                                                    tabindex="-1"
                                                                >
                                                                    <svg
                                                                        class="shrink-0"
                                                                        xmlns="http://www.w3.org/2000/svg"
                                                                        width="16px"
                                                                        height="16px"
                                                                        viewBox="0 0 24 24"
                                                                        fill="none"
                                                                        stroke="currentColor"
                                                                        stroke-width="2"
                                                                        stroke-linecap="round"
                                                                        stroke-linejoin="round"
                                                                    >
                                                                        <path d="M5 12h14"></path>
                                                                    </svg></button
                                                                ><input
                                                                    class="[&amp;::-webkit-inner-spin-button]:appearance-none [&amp;::-webkit-outer-spin-button]:appearance-none custom-slide w-8 border-0 bg-transparent p-0 text-center text-gray-800 [appearance:textfield] focus:ring-0"
                                                                    tabindex="-1"
                                                                    type="number"
                                                                    value="20"
                                                                /><button
                                                                    type="button"
                                                                    class="plus-btn flex size-6 w-full items-center justify-center gap-x-2 rounded-md border border-gray-300 bg-white p-1 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                                                                    tabindex="-1"
                                                                >
                                                                    <svg
                                                                        xmlns="http://www.w3.org/2000/svg"
                                                                        width="16px"
                                                                        height="16px"
                                                                        viewBox="0 0 20 20"
                                                                        fill="none"
                                                                    >
                                                                        <path
                                                                            d="M9.99984 4.16663V15.8333M4.1665 9.99996H15.8332"
                                                                            stroke="currentColor"
                                                                            stroke-width="1.66667"
                                                                            stroke-linecap="round"
                                                                            stroke-linejoin="round"
                                                                        ></path>
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-span-2 flex flex-col gap-1.5">
                                    <div
                                        class="grid grid-cols-2 gap-2.5 text-sm leading-5 sm:grid-cols-4"
                                    >
                                        <div>
                                            <label class="text-sm font-medium leading-tight text-slate-700"
                                                >{{ __('Tone') }}</label
                                            >
                                            <select
                                                class="form-select mt-2"
                                                id="tone-presen"
                                            >
                                                <option value="default" selected>{{ __('Unspecified') }}</option>
                                                <option value="casual">{{ __('Casual') }}</option>
                                                <option value="professional">{{ __('Professional') }}</option>
                                                <option value="funny">{{ __('Funny') }}</option>
                                                <option value="educational">{{ __('Educational') }}</option>
                                                <option value="sales_pitch">{{ __('Sales Pitch') }}</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label class="text-sm font-medium leading-tight text-slate-700"
                                                >{{ __('Amount of text') }}</label
                                            >
                                            <select
                                                class="form-select mt-2"
                                                id="amount-text-presen"
                                            >
                                                <option value="concise" selected>{{ __('Concise') }}</option>
                                                <option value="standard">{{ __('Standard') }}</option>
                                                <option value="text-heavy">{{ __('Text Heavy') }}</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="rounded-lg border-gray-200 bg-gray-100 p-4 mt-4">
                        <div
                            class="[&amp;>svg]:size-6 flex w-full items-center justify-between font-medium text-gray-900"
                            type="button"
                            aria-controls="radix-«r87»"
                            aria-expanded="true"
                            data-state="open"
                        >
                            <span class="font-bold text-gray-900" style="font-size: 1rem;">{{ __('Advance settings') }}</span>
                        </div>
                        <div class="grid grid-cols-1 gap-2.5 text-sm leading-5 sm:grid-cols-4 mt-4">
                            <div>
    							<label class="form-check form-switch d-flex align-items-center mt-2">
                                    <input class="form-check-input" type="checkbox">
                                    <label class="font-medium leading-tight text-slate-700 mx-2 whitespace-nowrap" style="margin-bottom: 0px;">{{ __('Add stock photos to the generated presentation') }}</label>
                                </label>
    						</div>
                            <div>
    							<label class="form-check form-switch d-flex align-items-center mt-2">
                                    <input class="form-check-input" name="include_cover" type="checkbox">
                                    <label class="font-medium leading-tight text-slate-700 mx-2 whitespace-nowrap" style="margin-bottom: 0px;">{{ __("Whether to include the 'cover' slide") }}</label>
                                </label>
    						</div>
                            <div>
    							<label class="form-check form-switch d-flex align-items-center mt-2">
                                    <input class="form-check-input" name="include_table_of_contents" type="checkbox">
                                    <label class="font-medium leading-tight text-slate-700 mx-2 whitespace-nowrap" style="margin-bottom: 0px;">{{ __("Whether to include the 'table of contents' slides") }}</label>
                                </label>
    						</div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <x-button class="btn btn-secondary rounded-lg bg-white prev-btn" type="button">
                        {{ __('Previous') }}
                    </x-button>
                    <x-button class="btn btn-primary rounded-lg next-btn" type="button">
                        {{ __('Next') }}
                    </x-button>
                </div>
            </div>
            <div id="pres-step-3" style="display: none;">
                <div class="modal-body">
                    <div
                        class="ring-offset-background focus-visible:ring-ring m-0 flex flex-col gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                        style=""
                    >
                        <div class="pb-1 pt-2">
                            <h4 class="px-1 text-base font-medium text-gray-900">
                                {{ __("SAB Innovation Center's Templates") }}
                            </h4>
                        </div>
                        <div class="grid grid-cols-2 gap-2.5 text-sm leading-5">
                            <div
                                role="button"
                                data-template="cmm1wzc65002pjn04a14llb35"
                                class="rounded-xl border-4 transition-all duration-200 hover:z-20 hover:scale-[97%] active:scale-[102%] border-primary-500"
                            >
                                <div
                                    role="button"
                                    id="presentation-template-cmm1wzc65002pjn04a14llb35"
                                    class="relative flex aspect-video flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow"
                                >
                                    <img
                                        class="absolute inset-0 z-10 object-cover transition-opacity duration-300 hover:opacity-0"
                                        alt="theme preview cover for cmm1wzc65002pjn04a14llb35"
                                        draggable="false"
                                        src="https://my.xelerate-sa.com/images/cover-sab.png"
                                    /><img
                                        class="absolute inset-0 object-cover"
                                        alt="theme preview content for cmm1wzc65002pjn04a14llb35"
                                        draggable="false"
                                        src="https://my.xelerate-sa.com/images/content-sab.png"
                                    />
                                </div>
                            </div>
                        </div>
                        <div class="pb-1 pt-2">
                            <h4 class="px-1 text-base font-medium text-gray-900">
                                {{ __('Other Templates') }}
                            </h4>
                        </div>
                        <div class="grid grid-cols-2 gap-2.5 text-sm leading-5" style="height: 350px; overflow-y: scroll;">
                            <div
                                role="button"
                                data-template="default"
                                class="rounded-xl border-4 transition-all duration-200 hover:z-20 hover:scale-[97%] active:scale-[102%]"
                            >
                                <div
                                    role="button"
                                    id="presentation-template-default"
                                    class="relative flex aspect-video flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow"
                                >
                                    <img
                                        class="absolute inset-0 z-10 object-cover transition-opacity duration-300 hover:opacity-0"
                                        alt="theme preview cover for default"
                                        draggable="false"
                                        src="https://slidespeak-files.s3.amazonaws.com/default-cover_2025-04-03_12-37-38.jpg"
                                    /><img
                                        class="absolute inset-0 object-cover"
                                        alt="theme preview content for default"
                                        draggable="false"
                                        src="https://slidespeak-files.s3.amazonaws.com/default-content_2025-04-03_12-37-38.jpg"
                                    />
                                </div>
                            </div>
                            <div
                                role="button"
                                data-template="adam"
                                class="cursor-pointer rounded-xl border-4 border-transparent transition-all duration-200 hover:z-20 hover:scale-[97%] active:scale-[102%]"
                            >
                                <div
                                    role="button"
                                    id="presentation-template-adam"
                                    class="relative flex aspect-video flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow"
                                >
                                    <img
                                        class="absolute inset-0 z-10 object-cover transition-opacity duration-300 hover:opacity-0"
                                        alt="theme preview cover for adam"
                                        draggable="false"
                                        src="https://slidespeak-files.s3.amazonaws.com/adam-cover_2025-04-03_12-32-20.jpg"
                                    /><img
                                        class="absolute inset-0 object-cover"
                                        alt="theme preview content for adam"
                                        draggable="false"
                                        src="https://slidespeak-files.s3.amazonaws.com/adam-content_2025-04-03_12-32-22.jpg"
                                    />
                                </div>
                            </div>
                            <div
                                role="button"
                                data-template="aurora"
                                class="cursor-pointer rounded-xl border-4 border-transparent transition-all duration-200 hover:z-20 hover:scale-[97%] active:scale-[102%]"
                            >
                                <div
                                    role="button"
                                    id="presentation-template-aurora"
                                    class="relative flex aspect-video flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow"
                                >
                                    <img
                                        class="absolute inset-0 z-10 object-cover transition-opacity duration-300 hover:opacity-0"
                                        alt="theme preview cover for aurora"
                                        draggable="false"
                                        src="https://slidespeak-files.s3.amazonaws.com/aurora-cover_2025-04-03_12-30-25.jpg"
                                    /><img
                                        class="absolute inset-0 object-cover"
                                        alt="theme preview content for aurora"
                                        draggable="false"
                                        src="https://slidespeak-files.s3.amazonaws.com/aurora-content_2025-04-03_12-30-26.jpg"
                                    />
                                </div>
                            </div>
                            <div
                                role="button"
                                data-template="bruno"
                                class="cursor-pointer rounded-xl border-4 border-transparent transition-all duration-200 hover:z-20 hover:scale-[97%] active:scale-[102%]"
                            >
                                <div
                                    role="button"
                                    id="presentation-template-bruno"
                                    class="relative flex aspect-video flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow"
                                >
                                    <img
                                        class="absolute inset-0 z-10 object-cover transition-opacity duration-300 hover:opacity-0"
                                        alt="theme preview cover for bruno"
                                        draggable="false"
                                        src="https://slidespeak-files.s3.amazonaws.com/Cover_2025-03-19_13-48-57.jpg"
                                    /><img
                                        class="absolute inset-0 object-cover"
                                        alt="theme preview content for bruno"
                                        draggable="false"
                                        src="https://slidespeak-files.s3.amazonaws.com/Content_2025-03-19_13-59-14.jpg"
                                    />
                                </div>
                            </div>
                            <div
                                role="button"
                                data-template="clyde"
                                class="cursor-pointer rounded-xl border-4 border-transparent transition-all duration-200 hover:z-20 hover:scale-[97%] active:scale-[102%]"
                            >
                                <div
                                    role="button"
                                    id="presentation-template-clyde"
                                    class="relative flex aspect-video flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow"
                                >
                                    <img
                                        class="absolute inset-0 z-10 object-cover transition-opacity duration-300 hover:opacity-0"
                                        alt="theme preview cover for clyde"
                                        draggable="false"
                                        src="https://slidespeak-files.s3.amazonaws.com/clyde-cover_2025-04-03_12-31-29.jpg"
                                    /><img
                                        class="absolute inset-0 object-cover"
                                        alt="theme preview content for clyde"
                                        draggable="false"
                                        src="https://slidespeak-files.s3.amazonaws.com/clyde-content_2025-04-03_12-31-31.jpg"
                                    />
                                </div>
                            </div>
                            <div
                                role="button"
                                data-template="daniel"
                                class="cursor-pointer rounded-xl border-4 border-transparent transition-all duration-200 hover:z-20 hover:scale-[97%] active:scale-[102%]"
                            >
                                <div
                                    role="button"
                                    id="presentation-template-daniel"
                                    class="relative flex aspect-video flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow"
                                >
                                    <img
                                        class="absolute inset-0 z-10 object-cover transition-opacity duration-300 hover:opacity-0"
                                        alt="theme preview cover for daniel"
                                        draggable="false"
                                        src="https://slidespeak-files.s3.amazonaws.com/daniel-cover_2025-04-03_12-28-49.jpg"
                                    /><img
                                        class="absolute inset-0 object-cover"
                                        alt="theme preview content for daniel"
                                        draggable="false"
                                        src="https://slidespeak-files.s3.amazonaws.com/daniel-content_2025-04-03_12-28-52.jpg"
                                    />
                                </div>
                            </div>
                            <div
                                role="button"
                                data-template="eddy"
                                class="cursor-pointer rounded-xl border-4 border-transparent transition-all duration-200 hover:z-20 hover:scale-[97%] active:scale-[102%]"
                            >
                                <div
                                    role="button"
                                    id="presentation-template-eddy"
                                    class="relative flex aspect-video flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow"
                                >
                                    <img
                                        class="absolute inset-0 z-10 object-cover transition-opacity duration-300 hover:opacity-0"
                                        alt="theme preview cover for eddy"
                                        draggable="false"
                                        src="https://slidespeak-files.s3.amazonaws.com/eddy-cover_2025-04-03_12-36-13.jpg"
                                    /><img
                                        class="absolute inset-0 object-cover"
                                        alt="theme preview content for eddy"
                                        draggable="false"
                                        src="https://slidespeak-files.s3.amazonaws.com/eddy-content_2025-04-03_12-36-15.jpg"
                                    />
                                </div>
                            </div>
                            <div
                                role="button"
                                data-template="felix"
                                class="cursor-pointer rounded-xl border-4 border-transparent transition-all duration-200 hover:z-20 hover:scale-[97%] active:scale-[102%]"
                            >
                                <div
                                    role="button"
                                    id="presentation-template-felix"
                                    class="relative flex aspect-video flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow"
                                >
                                    <img
                                        class="absolute inset-0 z-10 object-cover transition-opacity duration-300 hover:opacity-0"
                                        alt="theme preview cover for felix"
                                        draggable="false"
                                        src="https://slidespeak-files.s3.amazonaws.com/felix-cover_2025-04-03_12-27-56.jpg"
                                    /><img
                                        class="absolute inset-0 object-cover"
                                        alt="theme preview content for felix"
                                        draggable="false"
                                        src="https://slidespeak-files.s3.amazonaws.com/felix-content_2025-04-03_12-27-59.jpg"
                                    />
                                </div>
                            </div>
                            <div
                                role="button"
                                data-template="gradient"
                                class="cursor-pointer rounded-xl border-4 border-transparent transition-all duration-200 hover:z-20 hover:scale-[97%] active:scale-[102%]"
                            >
                                <div
                                    role="button"
                                    id="presentation-template-gradient"
                                    class="relative flex aspect-video flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow"
                                >
                                    <img
                                        class="absolute inset-0 z-10 object-cover transition-opacity duration-300 hover:opacity-0"
                                        alt="theme preview cover for gradient"
                                        draggable="false"
                                        src="https://slidespeak-files.s3.amazonaws.com/gradient-cover_2025-04-03_12-36-55.jpg"
                                    /><img
                                        class="absolute inset-0 object-cover"
                                        alt="theme preview content for gradient"
                                        draggable="false"
                                        src="https://slidespeak-files.s3.amazonaws.com/gradient-content_2025-04-03_12-36-57.jpg"
                                    />
                                </div>
                            </div>
                            <div
                                role="button"
                                data-template="iris"
                                class="cursor-pointer rounded-xl border-4 border-transparent transition-all duration-200 hover:z-20 hover:scale-[97%] active:scale-[102%]"
                            >
                                <div
                                    role="button"
                                    id="presentation-template-iris"
                                    class="relative flex aspect-video flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow"
                                >
                                    <img
                                        class="absolute inset-0 z-10 object-cover transition-opacity duration-300 hover:opacity-0"
                                        alt="theme preview cover for iris"
                                        draggable="false"
                                        src="https://slidespeak-files.s3.amazonaws.com/iris-cover_2025-04-03_12-26-29.jpg"
                                    /><img
                                        class="absolute inset-0 object-cover"
                                        alt="theme preview content for iris"
                                        draggable="false"
                                        src="https://slidespeak-files.s3.amazonaws.com/iris-content_2025-04-03_12-26-33.jpg"
                                    />
                                </div>
                            </div>
                            <div
                                role="button"
                                data-template="lavender"
                                class="cursor-pointer rounded-xl border-4 border-transparent transition-all duration-200 hover:z-20 hover:scale-[97%] active:scale-[102%]"
                            >
                                <div
                                    role="button"
                                    id="presentation-template-lavender"
                                    class="relative flex aspect-video flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow"
                                >
                                    <img
                                        class="absolute inset-0 z-10 object-cover transition-opacity duration-300 hover:opacity-0"
                                        alt="theme preview cover for lavender"
                                        draggable="false"
                                        src="https://slidespeak-files.s3.amazonaws.com/lavender-cover_2025-04-03_12-34-02.jpg"
                                    /><img
                                        class="absolute inset-0 object-cover"
                                        alt="theme preview content for lavender"
                                        draggable="false"
                                        src="https://slidespeak-files.s3.amazonaws.com/lavender-content_2025-04-03_12-34-04.jpg"
                                    />
                                </div>
                            </div>
                            <div
                                role="button"
                                data-template="monolith"
                                class="cursor-pointer rounded-xl border-4 border-transparent transition-all duration-200 hover:z-20 hover:scale-[97%] active:scale-[102%]"
                            >
                                <div
                                    role="button"
                                    id="presentation-template-monolith"
                                    class="relative flex aspect-video flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow"
                                >
                                    <img
                                        class="absolute inset-0 z-10 object-cover transition-opacity duration-300 hover:opacity-0"
                                        alt="theme preview cover for monolith"
                                        draggable="false"
                                        src="https://slidespeak-files.s3.amazonaws.com/monolith-cover_2025-04-03_12-35-35.jpg"
                                    /><img
                                        class="absolute inset-0 object-cover"
                                        alt="theme preview content for monolith"
                                        draggable="false"
                                        src="https://slidespeak-files.s3.amazonaws.com/monolith-content_2025-04-03_12-35-40.jpg"
                                    />
                                </div>
                            </div>
                            <div
                                role="button"
                                data-template="nebula"
                                class="cursor-pointer rounded-xl border-4 border-transparent transition-all duration-200 hover:z-20 hover:scale-[97%] active:scale-[102%]"
                            >
                                <div
                                    role="button"
                                    id="presentation-template-nebula"
                                    class="relative flex aspect-video flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow"
                                >
                                    <img
                                        class="absolute inset-0 z-10 object-cover transition-opacity duration-300 hover:opacity-0"
                                        alt="theme preview cover for nebula"
                                        draggable="false"
                                        src="https://slidespeak-files.s3.amazonaws.com/nebula-cover_2025-04-03_12-29-34.jpg"
                                    /><img
                                        class="absolute inset-0 object-cover"
                                        alt="theme preview content for nebula"
                                        draggable="false"
                                        src="https://slidespeak-files.s3.amazonaws.com/nebula-content_2025-04-03_12-29-37.jpg"
                                    />
                                </div>
                            </div>
                            <div
                                role="button"
                                data-template="nexus"
                                class="cursor-pointer rounded-xl border-4 border-transparent transition-all duration-200 hover:z-20 hover:scale-[97%] active:scale-[102%]"
                            >
                                <div
                                    role="button"
                                    id="presentation-template-nexus"
                                    class="relative flex aspect-video flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow"
                                >
                                    <img
                                        class="absolute inset-0 z-10 object-cover transition-opacity duration-300 hover:opacity-0"
                                        alt="theme preview cover for nexus"
                                        draggable="false"
                                        src="https://slidespeak-files.s3.amazonaws.com/nexus-cover_2025-04-03_12-34-52.jpg"
                                    /><img
                                        class="absolute inset-0 object-cover"
                                        alt="theme preview content for nexus"
                                        draggable="false"
                                        src="https://slidespeak-files.s3.amazonaws.com/nexus-content_2025-04-03_12-34-54.jpg"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
                <div class="modal-footer">
                    <x-button class="btn btn-secondary rounded-lg bg-white prev-btn" type="button">
                        {{ __('Previous') }}
                    </x-button>
                    <x-button class="btn btn-primary rounded-lg next-btn" type="button">
                        {{ __('Next') }}
                    </x-button>
                </div>
            </div>
            <div id="pres-step-4" style="display: none;">
                <div class="modal-body">
                    <div class="flex flex-col gap-4 rounded-xl border border-gray-200 bg-gray-100 p-4 shadow-sm">
                        <div
                            class="[&amp;>svg]:size-6 flex w-full items-center justify-between font-medium text-gray-900"
                            type="button"
                            aria-controls="radix-«r87»"
                            aria-expanded="true"
                            data-state="open"
                        >
                            <span class="font-bold text-gray-900" style="font-size: 1rem;">{{ __('Add Custom Instructions') }}</span>
                        </div>
                        <div class="flex flex-col gap-1">
                            <div class="flex h-full w-full flex-col gap-1">
                                <textarea
                                    id="presentation-steps-custom-instructions-input"
                                    rows="5"
                                    maxlength="3000"
                                    class="h-full w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-gray-900 outline-none placeholder:text-gray-500 focus:border-gray-400"
                                    placeholder="{{ __('Avoid using exclamation points in all slides.') }}"
                                ></textarea>
                            </div>
                        </div>
                        <div class="flex flex-wrap gap-2">
                            <button type="button" class="rounded-lg border border-gray-300 bg-white p-2 text-left text-xs text-slate-700 transition-colors hover:bg-gray-50 suggest-instructions">
                                {{ __('Only include the exact text from the document, no extra information') }}
                            </button>
                            <button type="button" class="rounded-lg border border-gray-300 bg-white p-2 text-left text-xs text-slate-700 transition-colors hover:bg-gray-50 suggest-instructions">
                                {{ __('Follow the instructions in the document very closely') }}
                            </button>
                            <button type="button" class="rounded-lg border border-gray-300 bg-white p-2 text-left text-xs text-slate-700 transition-colors hover:bg-gray-50 suggest-instructions">
                                {{ __('Include a conclusion slide') }}
                            </button>
                            <button type="button" class="rounded-lg border border-gray-300 bg-white p-2 text-left text-xs text-slate-700 transition-colors hover:bg-gray-50 suggest-instructions">
                                {{ __('Include a slide between each topic to introduce it') }}
                            </button>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <x-button class="btn btn-secondary rounded-lg bg-white prev-btn" type="button">
                        {{ __('Previous') }}
                    </x-button>
                    <x-button class="btn btn-primary rounded-lg next-btn" onclick="generatePitch();" type="button" disabled>
                        {{ __('Submit') }}
                    </x-button>
                </div>
            </div>
        </div>
    </div>
</div>

<div class="modal modal-blur fade" id="progressPptx" tabindex="-1" role="dialog" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered modal-lg" role="document">
    <div class="modal-content p-4 text-center">
      <!-- Biểu tượng -->
      <div class="mb-3">
        <i class="ti ti-presentation text-primary" style="font-size: 48px; animation: pulse 1.5s infinite;"></i>
      </div>
      <h3 class="mb-2" id="progress-title">
        {{ __('Your pitch deck is being generated...') }}
      </h3>
      <p class="text-muted mb-3" id="progress-step-text">
        {{ __('Validating your data...') }}
      </p>
      <div class="progress progress-separated mt-2 mb-1" style="height: 20px;">
        <div class="progress-bar bg-primary" role="progressbar" id="progress-bar" style="width: 0%">
        </div>
      </div>

      <p class="fw-bold mb-0" id="progress-percent">0%</p>
    </div>
  </div>
</div>

@endsection

@push('script')
    <script>
        function goToViaUrl(url) {
            location.href = url;
        }
        
        let deleteId = null;
    
        const deleteUrlTemplate = `{{ LaravelLocalization::localizeUrl(route('dashboard.user.pitch.delete', ['id' => '__PITCH_ID__'])) }}`;
    
        function confirmDelete(id, name) {
            deleteId = id;
            $('#delete-confirm-message').text(`Are you sure you want to delete "${name}"?`);
            $('#confirmDeleteModal').modal('show');
        }
    
        $('#delete-confirm-btn').on('click', function () {
            if (!deleteId) return;
    
            const url = deleteUrlTemplate.replace('__PITCH_ID__', deleteId);
    
            $.ajax({
                url: url,
                type: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': '{{ csrf_token() }}'
                },
                success: function () {
                    location.reload();
                },
                error: function () {
                    alert('Failed to delete pitch deck.');
                }
            });
        });
    </script>


    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js"></script>
    <script>
      $(document).ready(function () {
        $('.aspect-video').hover(
          function () {
            $(this).find('img.z-10').css('opacity', '0');
          },
          function () {
            $(this).find('img.z-10').css('opacity', '1');
          }
        );
    
        $('[id^="presentation-template-"]').closest('[role="button"]').on('click', function () {
          $('[id^="presentation-template-"]').closest('[role="button"]').parent().removeClass('border-primary-500').addClass('border-transparent');
          
          $(this).parent().removeClass('border-transparent').addClass('border-primary-500');
        });
      });
    </script>
    <script>
        var isUpload = false;
        $(document).ready(function () {
            $('.suggest-topic').on('click', function () {
                const topic = $(this).text().trim();
                $('#presentation-steps-topic-input').val(topic).trigger('input');
            });
            
            $('#pitch_idea_selected').on('change', function() {
                var topic = $(this).val();
                $('#presentation-steps-topic-input').val(topic).trigger('input');
            });
        
            $('#presentation-steps-topic-input').on('input', function () {
                const value = $(this).val().trim();
                if (value.length > 0) {
                    $('#pres-step-1 .next-btn').prop('disabled', false);
                } else {
                    $('#pres-step-1 .next-btn').prop('disabled', true);
                }
        
                const count = value.length;
                $('#pres-step-1 .text-sm.text-gray-500').text(`${count}/3000 {{ __('characters') }}`);
            });
            
            $('.suggest-instructions').on('click', function () {
                const topic = $(this).text().trim();
                const $input = $('#presentation-steps-custom-instructions-input');
                const current = $input.val().trim();
            
                if (current === '') {
                    $input.val(topic);
                } else {
                    $input.val(current + ', ' + topic);
                }
            
                $input.trigger('input');
            });
        
            $('#presentation-steps-custom-instructions-input').on('input', function () {
                const value = $(this).val().trim();
                if (value.length > 0) {
                    $('#pres-step-4 .next-btn').prop('disabled', false);
                } else {
                    $('#pres-step-4 .next-btn').prop('disabled', true);
                }
            });
        
            $('#pres-step-1 .next-btn').on('click', function () {
                $('#upload-title').hide();
                $('#normal-title').show();
                $('#upload-body').hide();
                $('#normal-body').show();
                $('#pres-step-1').hide();
                $('#pres-step-2').show();
                $('#pres-step-2 .prev-btn').prop('disabled', false);
            });
        
            $('#pres-step-2 .prev-btn').on('click', function () {
                if (isUpload) {
                    $('#upload-title').show();
                    $('#normal-title').hide();
                    $('#upload-body').show();
                    $('#normal-body').hide();
                } else {
                    $('#upload-title').hide();
                    $('#normal-title').show();
                    $('#upload-body').hide();
                    $('#normal-body').show();
                }
                $('#pres-step-2').hide();
                $('#pres-step-1').show();
            });
            
            $('#pres-step-2 .next-btn').on('click', function () {
                $('#pres-step-2').hide();
                $('#pres-step-3').show();
            });
        
            $('#pres-step-3 .prev-btn').on('click', function () {
                $('#pres-step-3').hide();
                $('#pres-step-2').show();
            });
            
            $('#pres-step-3 .next-btn').on('click', function () {
                $('#pres-step-3').hide();
                $('#pres-step-4').show();
            });
        
            $('#pres-step-4 .prev-btn').on('click', function () {
                $('#pres-step-4').hide();
                $('#pres-step-3').show();
            });
        });
    </script>
    
    <script>
        $(document).ready(function () {
            $('.radio-fake').on('click', function () {
                if (!$(this).hasClass('active')) {
                    $('.radio-fake').removeClass('active');
                    $(this).addClass('active')
                }
            });
            
            $('.minus-btn').on('click', function () {
                const $input = $(this).siblings('input[type="number"]');
                let value = parseInt($input.val()) || 0;
                if (value > 0) value--;
                $input.val(value).trigger('change');
            });
        
            $('.plus-btn').on('click', function () {
                const $input = $(this).siblings('input[type="number"]');
                let value = parseInt($input.val()) || 0;
                value++;
                $input.val(value).trigger('change');
            });
        });
        
        function getStep2Data() {
          let length = null;
        
          $('#pres-step-2 .radio-fake').each(function () {
            const isActive = $(this).hasClass('active');
            if (isActive) {
              const val = $(this).find('[data-value]').data('value');
              if (val) {
                length = parseInt(val);
              } else {
                const customInput = $(this).find('input[type="number"]');
                if (customInput.length) {
                  length = parseInt(customInput.val());
                }
              }
            }
          });
        
          const tone = $('#tone-presen').val();
        
          const verbosity = $('#amount-text-presen').val();
        
          const fetch_images = $('#pres-step-2 input[type="checkbox"]').eq(0).prop('checked') == true ? 1 : 0;
          const include_cover = $('#pres-step-2 input[name="include_cover"]').prop('checked') == true ? 1 : 0;
          const include_table_of_contents = $('#pres-step-2 input[name="include_table_of_contents"]').prop('checked') == true ? 1 : 0;
        
          return {
            length,
            tone,
            verbosity,
            fetch_images,
            include_cover,
            include_table_of_contents
          };
        }
        
        function generatePitch() {
            let selectedTemplate = $('#pres-step-3 .border-primary-500').data('template');
            let data = getStep2Data();
        
            let plainText = $('#presentation-steps-topic-input').val();
            let customInstructions = $('#presentation-steps-custom-instructions-input').val();
            let file = $('#upload-dropzone input[type="file"]')[0].files[0];
            let totalSlide = parseInt(data.length) || 20;
            let estimatedTime = Math.round(20 + (totalSlide - 3) * 2);
        
            const url = `{{ LaravelLocalization::localizeUrl(route('dashboard.user.pitch.store')) }}`;
        
            let formData = new FormData();
        
            formData.append('name', 'Pitch Deck');
            formData.append('template', selectedTemplate);
            formData.append('plain_text', plainText);
            formData.append('custom_user_instructions', customInstructions);
        
            if (file) {
                formData.append('file', file);
            }
        
            const fields = ['length', 'tone', 'verbosity', 'fetch_images', 'include_cover', 'include_table_of_contents'];
            fields.forEach(field => {
                if (data[field] !== undefined) {
                    formData.append(field, data[field]);
                }
            });
        
            $.ajax({
                url: url,
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                success: function (response) {
                    $('#createPresentationModal').modal('hide');
                    $('#progressPptx').modal('show');
                    let currentStep = 0;
                    let progress = 0;
                    let steps = [
                        { percent: 10, text: "{{ __('Validating your data...') }}" },
                        { percent: 30, text: "{{ __('Generating outline...') }}" },
                        { percent: 55, text: "{{ __('Creating slide content...') }}" },
                        { percent: 75, text: "{{ __('Formatting pitch deck...') }}" },
                        { percent: 90, text: "{{ __('Finalizing and uploading...') }}" },
                        { percent: 99, text: "{{ __('Waiting for final confirmation...') }}" }
                    ];
                    
                    let progressInterval = setInterval(() => {
                        if (currentStep >= steps.length) return;
                    
                        progress = steps[currentStep].percent;
                        $('#progress-bar').css('width', progress + '%');
                        $('#progress-step-text').text(steps[currentStep].text);
                        $('#progress-percent').text(progress + '%');
                        currentStep++;
                    }, (estimatedTime * 1000) / steps.length);
                    
                    const pitchId = response.id;
        
                    const checkUrl = `{{ LaravelLocalization::localizeUrl(route('dashboard.user.pitch.updateStatus', '__PITCH_ID__')) }}`.replace('__PITCH_ID__', pitchId);
                    const detailUrl = `/dashboard/user/pitch/${pitchId}`;
        
                    let interval = setInterval(() => {
                        $.ajax({
                            url: checkUrl,
                            method: 'POST',
                            success: function(statusResponse) {
                                if (statusResponse.status === 'SUCCESS') {
                                    clearInterval(interval);
                                    clearInterval(progressInterval);
                                    $('#progressPptx').modal('hide');
                                    window.location.href = detailUrl;
                                } else if (statusResponse.status === 'FAILED') {
                                    clearInterval(interval);
                                    clearInterval(progressInterval);
                                    $('#progressPptx').modal('hide');
                                }
                            },
                            error: function() {
                                clearInterval(interval);
                                clearInterval(progressInterval);
                                toastr.error("{{ __('Failed to create pitch deck!') }}");
                            }
                        });
                    }, (estimatedTime * 1000) / steps.length);
                },
                error: function(xhr) {
                    console.error("Failed to create pitch deck: " + xhr.responseText);
                }
            });
        }
    </script>


    <script>
        $(document).ready(function () {
            let $textarea = $("#pitch-description");
            let $progressBar = $(".progress-bar-pitch");
            let $submitButton = $(".btn-generate-pitch");
        
            $textarea.on("input", function () {
                let text = $(this).val().trim();
                let wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
                let charCount = text.length;
        
                let wordProgress = Math.min((wordCount / 3) * 100, 100);
                let charProgress = Math.min((charCount / 20) * 100, 100);
        
                let progress = Math.min(wordProgress, charProgress);
                $progressBar.css("width", progress + "%");
        
                if (wordCount >= 3 && charCount > 20) {
                    $submitButton.prop("disabled", false);
                    $progressBar.css("width", "100%");
                } else {
                    $submitButton.prop("disabled", true);
                }
            });
        });
            
        function showPresentationModal(steps = '') {
            const $nextBtn = $('#pres-step-1 .next-btn');
            const $dropzone = $('#upload-dropzone');
            const $input = $dropzone.find('input[type="file"]');
            if (steps == '0') {
                isUpload = true;
                const file = $input[0].files[0];
                if (!file) {
                    $nextBtn.prop('disabled', true);
                }
                $('#upload-title').show();
                $('#normal-title').hide();
                $('#upload-body').show();
                $('#normal-body').hide();
                
                $('#pres-step-1').show();
                $('#pres-step-2').hide();
                $('#pres-step-3').hide();
                $('#pres-step-4').hide();
                $('#pres-step-5').hide();
            } else {
                isUpload = false;
                if (!$('#presentation-steps-topic-input').val().trim()) {
                    $nextBtn.prop('disabled', true);
                }
                $('#upload-title').hide();
                $('#normal-title').show();
                $('#upload-body').hide();
                $('#normal-body').show();
                
                $('#pres-step-1').show();
                $('#pres-step-2').hide();
                $('#pres-step-3').hide();
                $('#pres-step-4').hide();
                $('#pres-step-5').hide();
            }
            $('#bankAccountModal').modal('hide');
            $('#createPresentationModal').modal('show');
        }
    </script>
    
    <script>
        $(document).ready(function () {
            const $dropzone = $('#upload-dropzone');
            const $input = $dropzone.find('input[type="file"]');
            const $nextBtn = $('#pres-step-1 .next-btn');
        
            const $fileInfo = $(`
                <div class="flex h-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white p-4 transition-colors data-[uploading=false]:hover:border-blue-600 md:h-full h-150 md:p-8 hidden">
                    <div class="flex items-center justify-center gap-2 file-info text-sm text-gray-800">
                        <span class="file-icon">📄</span>
                        <span class="file-name font-medium"></span>
                        <button type="button" class="text-red-500 hover:underline remove-file">Remove</button>
                    </div>
                </div>
            `);
            $dropzone.after($fileInfo);
        
            $dropzone.on('click', function (e) {
                if (!$(e.target).is('input')) {
                    $input.trigger('click');
                }
            });
        
            $input.on('change', function () {
                const file = this.files[0];
                if (file) {
                    $fileInfo.find('.file-name').text(file.name);
                    $fileInfo.removeClass('hidden');
                    $dropzone.addClass('hidden');
                    $nextBtn.prop('disabled', false);
                }
            });
        
            $dropzone.on('dragover', function (e) {
                e.preventDefault();
                $dropzone.addClass('border-blue-600 bg-blue-50');
            });
        
            $dropzone.on('dragleave drop', function (e) {
                e.preventDefault();
                $dropzone.removeClass('border-blue-600 bg-blue-50');
            });
        
            $dropzone.on('drop', function (e) {
                const files = e.originalEvent.dataTransfer.files;
                if (files.length > 0) {
                    $input[0].files = files;
                    $input.trigger('change');
                }
            });
        
            $fileInfo.on('click', '.remove-file', function () {
                $input.val('');
                $fileInfo.addClass('hidden');
                $dropzone.removeClass('hidden');
                $nextBtn.prop('disabled', true);
            });
        });
    </script>

@endpush